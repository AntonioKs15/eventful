"use client";

import { EventLayoutType, UserRole } from "@eventful/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { QuantityPicker } from "@/components/quantity-picker";
import { SeatPicker } from "@/components/seat-picker";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { Button } from "@/components/ui/button";
import { getEvent, getSeatAvailability } from "@/lib/events/events-api";
import { SeatAvailabilityMap } from "@/lib/events/types";
import { formatEventDate, formatEventTime, formatPriceCents } from "@/lib/format";
import { createReservation } from "@/lib/reservations/reservations-api";
import { useAuth } from "@/lib/auth/auth-context";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { status, user } = useAuth();
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);

  const eventQuery = useQuery({ queryKey: ["event", id], queryFn: () => getEvent(id) });
  const seatsQuery = useQuery({
    queryKey: ["event-seats", id],
    queryFn: () => getSeatAvailability(id),
    enabled: eventQuery.data?.layoutType === EventLayoutType.SEATED,
  });

  const reserveMutation = useMutation({
    mutationFn: () =>
      createReservation(
        eventQuery.data?.layoutType === EventLayoutType.SEATED
          ? { eventId: id, seatIds: Array.from(selectedSeatIds) }
          : { eventId: id, quantity },
      ),
    onSuccess: (reservation) => router.push(`/checkout/${reservation.id}`),
  });

  if (eventQuery.isPending) {
    return <p className="mx-auto max-w-3xl px-6 py-16 text-surface-500">Loading event…</p>;
  }

  if (!eventQuery.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ApiErrorNotice error={eventQuery.error} />
      </div>
    );
  }

  const event = eventQuery.data;
  const isSeated = event.layoutType === EventLayoutType.SEATED;
  const remaining = event.generalAdmissionPool
    ? event.generalAdmissionPool.capacity - event.generalAdmissionPool.sold
    : 0;
  const canReserve = status === "authenticated" && user?.role === UserRole.CUSTOMER;
  const hasSelection = isSeated ? selectedSeatIds.size > 0 : quantity > 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex gap-5">
        {event.movie ? (
          <Link
            href={`/movies/${event.movie.id}`}
            className="focus-ring relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-800"
          >
            <Image src={event.movie.posterImageUrl} alt={event.movie.title} fill sizes="96px" className="object-cover" />
          </Link>
        ) : null}
        <div>
          <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">
            {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)}
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-foreground">
            {event.movie?.title ?? event.title}
          </h1>
          <p className="mt-2 text-surface-400">
            {event.venue.name} · {event.venue.city}
          </p>
        </div>
      </div>

      <p className="max-w-2xl text-foreground/90">{event.description}</p>

      <div className="ticket-stub rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <p className="font-ticket text-xs uppercase tracking-wide text-foreground/60">
            {isSeated ? "Choose your seats" : "Choose a quantity"}
          </p>
          <p className="font-display text-2xl font-bold text-foreground">
            {formatPriceCents(event.priceCents)}
          </p>
        </div>

        <div className="mt-4">
          {isSeated ? (
            <SeatMapPanel
              seatMap={seatsQuery.data ?? null}
              selected={selectedSeatIds}
              onChange={setSelectedSeatIds}
            />
          ) : (
            <QuantityPicker quantity={quantity} remaining={remaining} onChange={setQuantity} />
          )}
        </div>

        <div className="ticket-perforation mt-5 flex items-center justify-between pt-4">
          <ReserveCallToAction
            canReserve={canReserve}
            isAuthenticated={status === "authenticated"}
            hasSelection={hasSelection}
            isPending={reserveMutation.isPending}
            onReserve={() => reserveMutation.mutate()}
          />
        </div>
      </div>

      <ApiErrorNotice error={reserveMutation.error} />
    </div>
  );
}

function ReserveCallToAction({
  canReserve,
  isAuthenticated,
  hasSelection,
  isPending,
  onReserve,
}: {
  canReserve: boolean;
  isAuthenticated: boolean;
  hasSelection: boolean;
  isPending: boolean;
  onReserve: () => void;
}) {
  if (!isAuthenticated) {
    return (
      <a href="/login" className="font-ticket text-sm text-foreground/70 underline">
        Log in as a customer to reserve
      </a>
    );
  }

  if (!canReserve) {
    return (
      <p className="font-ticket text-sm text-foreground/60">
        Only customer accounts can reserve tickets.
      </p>
    );
  }

  return (
    <Button type="button" disabled={!hasSelection || isPending} onClick={onReserve}>
      {isPending ? "Reserving…" : "Reserve"}
    </Button>
  );
}

function SeatMapPanel({
  seatMap,
  selected,
  onChange,
}: {
  seatMap: SeatAvailabilityMap | null;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  if (!seatMap) {
    return <p className="text-sm text-foreground/60">Loading seat map…</p>;
  }

  return <SeatPicker seatMap={seatMap} selected={selected} onChange={onChange} />;
}
