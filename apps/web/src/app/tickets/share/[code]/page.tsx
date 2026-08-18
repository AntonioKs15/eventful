"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { ticketStatusLabel, ticketStatusTone } from "@/lib/tickets/ticket-status-presentation";
import { getTicketByPublicCode } from "@/lib/tickets/tickets-api";

export default function SharedTicketPage() {
  const { code } = useParams<{ code: string }>();
  const { data, isPending, error } = useQuery({
    queryKey: ["shared-ticket", code],
    queryFn: () => getTicketByPublicCode(code),
  });

  if (isPending) {
    return <p className="mx-auto max-w-md px-6 py-16 text-surface-500">Loading ticket…</p>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <ApiErrorNotice error={error} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">Shared ticket</p>
      <div className="ticket-stub rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-ticket text-xs uppercase tracking-[0.15em] text-foreground/60">
              {formatEventDate(data.event.startsAt)} · {formatEventTime(data.event.startsAt)}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold uppercase leading-tight text-foreground">
              {data.event.title}
            </h1>
            <p className="mt-1 text-sm text-foreground/70">
              {data.event.venue.name} · {data.event.venue.city}
            </p>
          </div>
          <StatusPill tone={ticketStatusTone(data.status)} label={ticketStatusLabel(data.status)} />
        </div>

        <div className="ticket-perforation mt-5 pt-4">
          <p className="font-ticket text-sm text-foreground/70">
            {data.seat ? `Seat ${data.seat.rowLabel}${data.seat.seatNumber}` : "General admission"}
          </p>
        </div>
      </div>
      <p className="text-center text-xs text-surface-500">
        This is a shared view. Show the ticket owner&apos;s QR at the gate to enter.
      </p>
    </div>
  );
}
