"use client";

import { EventStatus, PAGINATION_DEFAULTS, UserRole } from "@eventful/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusPill } from "@/components/ui/status-pill";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { listMyEvents, publishEvent } from "@/lib/events/events-api";
import { EventSummary } from "@/lib/events/types";
import { eventStatusLabel, eventStatusTone } from "@/lib/events/event-status-presentation";
import { formatEventDate, formatPriceCents } from "@/lib/format";

function OrganizerEventsList() {
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["my-events", page],
    queryFn: () => listMyEvents({ page, pageSize: PAGINATION_DEFAULTS.PAGE_SIZE }),
  });

  const publishMutation = useMutation({
    mutationFn: publishEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-events"] }),
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-ticket text-xs uppercase tracking-[0.2em] text-marquee">Box office</p>
          <h1 className="font-display text-5xl font-bold uppercase leading-none text-paper">
            My events
          </h1>
        </div>
        <Link href="/organizer/events/new">
          <Button type="button">Create event</Button>
        </Link>
      </div>

      <ApiErrorNotice error={error} />
      <ApiErrorNotice error={publishMutation.error} />

      <OrganizerEventsResults
        isPending={isPending}
        data={data}
        onPageChange={setPage}
        onPublish={(id) => publishMutation.mutate(id)}
        isPublishing={publishMutation.isPending}
      />
    </div>
  );
}

function OrganizerEventsResults({
  isPending,
  data,
  onPageChange,
  onPublish,
  isPublishing,
}: {
  isPending: boolean;
  data: Awaited<ReturnType<typeof listMyEvents>> | undefined;
  onPageChange: (page: number) => void;
  onPublish: (eventId: string) => void;
  isPublishing: boolean;
}) {
  if (isPending) {
    return <p className="text-ink-500">Loading your events…</p>;
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="No events yet"
        description="Create your first event, from scratch or from the Ticketmaster catalog."
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {data.data.map((event) => (
          <OrganizerEventRow
            key={event.id}
            event={event}
            onPublish={onPublish}
            isPublishing={isPublishing}
          />
        ))}
      </div>
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </>
  );
}

function OrganizerEventRow({
  event,
  onPublish,
  isPublishing,
}: {
  event: EventSummary;
  onPublish: (eventId: string) => void;
  isPublishing: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-ink-700 px-5 py-4">
      <div>
        <p className="font-ticket text-xs uppercase tracking-wide text-ink-500">
          {formatEventDate(event.startsAt)}
        </p>
        <p className="font-display text-xl font-bold uppercase text-paper">{event.title}</p>
        <p className="text-sm text-ink-400">
          {event.venue.name} · {formatPriceCents(event.priceCents)}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <StatusPill tone={eventStatusTone(event.status)} label={eventStatusLabel(event.status)} />
        {event.status === EventStatus.DRAFT ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isPublishing}
            onClick={() => onPublish(event.id)}
          >
            Publish
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function OrganizerEventsPage() {
  return (
    <AuthGuard allow={[UserRole.ORGANIZER]}>
      <OrganizerEventsList />
    </AuthGuard>
  );
}
