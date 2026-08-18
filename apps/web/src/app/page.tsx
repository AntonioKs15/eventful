"use client";

import { EventSortBy, PAGINATION_DEFAULTS } from "@eventful/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EventCard } from "@/components/event-card";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { listPublishedEvents } from "@/lib/events/events-api";

const SORT_OPTIONS: { value: EventSortBy; label: string }[] = [
  { value: EventSortBy.STARTS_AT, label: "Soonest first" },
  { value: EventSortBy.PRICE_CENTS, label: "Lowest price first" },
];

export default function HomePage() {
  const [city, setCity] = useState("");
  const [sortBy, setSortBy] = useState<EventSortBy>(EventSortBy.STARTS_AT);
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);

  const { data, isPending, error } = useQuery({
    queryKey: ["events", { city, sortBy, page }],
    queryFn: () =>
      listPublishedEvents({
        city: city || undefined,
        sortBy,
        page,
        pageSize: PAGINATION_DEFAULTS.PAGE_SIZE,
      }),
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
      <section className="flex flex-col gap-3">
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-marquee">Now booking</p>
        <h1 className="font-display text-5xl font-bold uppercase leading-none text-paper sm:text-6xl">
          Find your next night out
        </h1>
        <p className="max-w-xl text-ink-400">
          Shows, festivals, and screenings with a ticket that can&apos;t be faked. Reserve a seat or a spot
          in the pit, pay, and walk in with a QR code that only ever works once.
        </p>
      </section>

      <section className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-400">City</span>
          <input
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setPage(PAGINATION_DEFAULTS.PAGE);
            }}
            placeholder="Any city"
            className="focus-ring rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-paper placeholder:text-ink-500"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-400">Sort by</span>
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as EventSortBy);
              setPage(PAGINATION_DEFAULTS.PAGE);
            }}
            className="focus-ring rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-paper"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <ApiErrorNotice error={error} />

      <EventsResults isPending={isPending} data={data} onPageChange={setPage} />
    </div>
  );
}

function EventsResults({
  isPending,
  data,
  onPageChange,
}: {
  isPending: boolean;
  data: Awaited<ReturnType<typeof listPublishedEvents>> | undefined;
  onPageChange: (page: number) => void;
}) {
  if (isPending) {
    return <p className="text-ink-500">Loading events…</p>;
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="No events found"
        description="Try a different city, or check back soon — organizers publish new events all the time."
      />
    );
  }

  return (
    <>
      <section className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {data.data.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </section>
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </>
  );
}
