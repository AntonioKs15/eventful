import { EventLayoutType } from "@eventful/contracts";
import Link from "next/link";
import { TicketStub } from "@/components/ui/ticket-stub";
import { formatEventDate, formatPriceCents } from "@/lib/format";
import { EventSummary } from "@/lib/events/types";

const LAYOUT_LABEL: Record<EventLayoutType, string> = {
  [EventLayoutType.SEATED]: "Assigned seating",
  [EventLayoutType.GENERAL_ADMISSION]: "General admission",
};

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link href={`/events/${event.id}`} className="focus-ring block rounded-2xl">
      <TicketStub
        className="transition-transform hover:-translate-y-1"
        stub={
          <>
            <span className="font-ticket text-xs uppercase tracking-wide text-ink-950/60">
              {LAYOUT_LABEL[event.layoutType]}
            </span>
            <span className="font-display text-xl font-bold text-ink-950">→</span>
          </>
        }
      >
        <p className="font-ticket text-xs uppercase tracking-[0.15em] text-ink-950/60">
          {formatEventDate(event.startsAt)}
        </p>
        <h3 className="mt-1 font-display text-2xl font-bold uppercase leading-tight text-ink-950">
          {event.title}
        </h3>
        <p className="mt-1 text-sm text-ink-950/70">
          {event.venue.name} · {event.venue.city}
        </p>
        <p className="mt-3 font-ticket text-lg text-marquee-dim">{formatPriceCents(event.priceCents)}</p>
      </TicketStub>
    </Link>
  );
}
