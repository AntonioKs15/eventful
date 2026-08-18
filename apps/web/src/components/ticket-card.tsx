import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { TicketStub } from "@/components/ui/ticket-stub";
import { formatEventDate } from "@/lib/format";
import { ticketStatusLabel, ticketStatusTone } from "@/lib/tickets/ticket-status-presentation";
import { Ticket } from "@/lib/tickets/tickets-api";

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Link href={`/tickets/${ticket.id}`} className="focus-ring block rounded-2xl">
      <TicketStub
        className="transition-transform hover:-translate-y-1"
        stub={
          <>
            <span className="font-ticket text-xs uppercase tracking-wide text-ink-950/60">
              {ticket.seat ? `Seat ${ticket.seat.rowLabel}${ticket.seat.seatNumber}` : "General admission"}
            </span>
            <span className="font-display text-xl font-bold text-ink-950">→</span>
          </>
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-ticket text-xs uppercase tracking-[0.15em] text-ink-950/60">
              {formatEventDate(ticket.event.startsAt)}
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold uppercase leading-tight text-ink-950">
              {ticket.event.title}
            </h3>
            <p className="mt-1 text-sm text-ink-950/70">
              {ticket.event.venue.name} · {ticket.event.venue.city}
            </p>
          </div>
          <StatusPill tone={ticketStatusTone(ticket.status)} label={ticketStatusLabel(ticket.status)} />
        </div>
      </TicketStub>
    </Link>
  );
}
