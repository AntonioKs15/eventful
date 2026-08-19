"use client";

import { EventLayoutType, PaymentOutcome, SubscriptionStatus } from "@eventful/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { Button } from "@/components/ui/button";
import { formatEventDate, formatPriceCents } from "@/lib/format";
import { pay, redeemWithSubscription } from "@/lib/payments/payments-api";
import type { PaymentResult } from "@/lib/payments/payments-api";
import { formatCountdown } from "@/lib/reservations/format-countdown";
import { getReservation } from "@/lib/reservations/reservations-api";
import type { Subscription } from "@/lib/subscriptions/subscriptions-api";
import { getMySubscription } from "@/lib/subscriptions/subscriptions-api";

function useMillisecondsRemaining(expiresAt: string | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!expiresAt) {
    return 0;
  }
  return new Date(expiresAt).getTime() - now;
}

function createPaymentResultHandler(
  router: ReturnType<typeof useRouter>,
  reservationId: string,
  setDeclined: (declined: boolean) => void,
) {
  return (result: PaymentResult) => {
    if (result.payment.status === "DECLINED") {
      setDeclined(true);
      return;
    }
    const ticketIds = result.tickets.map((ticket) => ticket.id).join(",");
    router.push(`/checkout/${reservationId}/success?tickets=${ticketIds}`);
  };
}

function RedeemWithSubscriptionButton({
  subscription,
  quantity,
  disabled,
  onRedeem,
}: {
  subscription: Subscription | null | undefined;
  quantity: number;
  disabled: boolean;
  onRedeem: () => void;
}) {
  const canRedeem =
    subscription?.status === SubscriptionStatus.ACTIVE &&
    subscription.freeTicketsRemaining >= quantity;

  if (!canRedeem) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled}
      onClick={onRedeem}
      className="mt-4 w-full"
    >
      Use free ticket from subscription ({subscription.freeTicketsRemaining} left)
    </Button>
  );
}

export default function CheckoutPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const router = useRouter();
  const [declined, setDeclined] = useState(false);

  const reservationQuery = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => getReservation(reservationId),
  });

  const msRemaining = useMillisecondsRemaining(reservationQuery.data?.expiresAt);
  const isExpired = reservationQuery.data ? msRemaining <= 0 : false;

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", "me"],
    queryFn: getMySubscription,
  });

  const handlePaymentResult = createPaymentResultHandler(
    router,
    reservationId,
    setDeclined,
  );

  const payMutation = useMutation({
    mutationFn: (outcome: PaymentOutcome) => pay(reservationId, outcome),
    onSuccess: handlePaymentResult,
  });

  const redeemMutation = useMutation({
    mutationFn: () => redeemWithSubscription(reservationId),
    onSuccess: handlePaymentResult,
  });

  if (reservationQuery.isPending) {
    return <p className="mx-auto max-w-xl px-6 py-16 text-surface-500">Loading your reservation…</p>;
  }

  if (!reservationQuery.data) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <ApiErrorNotice error={reservationQuery.error} />
      </div>
    );
  }

  const reservation = reservationQuery.data;
  const event = reservation.event;
  const quantity =
    event.layoutType === EventLayoutType.GENERAL_ADMISSION ? (reservation.quantity ?? 1) : 1;
  const totalCents = event.priceCents * quantity;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">Checkout</p>
        <h1 className="font-display text-4xl font-bold uppercase text-foreground">{event.title}</h1>
        <p className="mt-1 text-surface-400">
          {formatEventDate(event.startsAt)} · {event.venue.name}, {event.venue.city}
        </p>
      </div>

      {declined ? (
        <DeclinedNotice eventId={event.id} />
      ) : (
        <div className="ticket-stub rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <span className="font-ticket text-xs uppercase tracking-wide text-foreground/60">
              {event.layoutType === EventLayoutType.SEATED
                ? "1 seat held"
                : `${quantity} tickets held`}
            </span>
            <span className="font-display text-2xl font-bold text-foreground">
              {formatPriceCents(totalCents)}
            </span>
          </div>

          <p className="mt-3 font-ticket text-sm text-foreground/70">
            {isExpired ? (
              <span className="text-negative">Your hold has expired.</span>
            ) : (
              <>Hold expires in {formatCountdown(msRemaining)}</>
            )}
          </p>

          <RedeemWithSubscriptionButton
            subscription={subscriptionQuery.data}
            quantity={quantity}
            disabled={isExpired || redeemMutation.isPending}
            onRedeem={() => redeemMutation.mutate()}
          />

          <div className="ticket-perforation mt-5 flex flex-col gap-3 pt-4 sm:flex-row">
            <Button
              type="button"
              disabled={isExpired || payMutation.isPending}
              onClick={() => payMutation.mutate(PaymentOutcome.APPROVE)}
              className="flex-1"
            >
              Confirm payment
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isExpired || payMutation.isPending}
              onClick={() => payMutation.mutate(PaymentOutcome.DECLINE)}
              className="flex-1"
            >
              Simulate decline
            </Button>
          </div>
        </div>
      )}

      <ApiErrorNotice error={payMutation.error} />
      <ApiErrorNotice error={redeemMutation.error} />
    </div>
  );
}

function DeclinedNotice({ eventId }: { eventId: string }) {
  return (
    <div className="rounded-2xl border border-negative/40 bg-negative/10 p-6">
      <p className="font-display text-2xl font-bold uppercase text-foreground">Payment declined</p>
      <p className="mt-2 text-sm text-surface-400">
        Your hold on this event was released. No charge was made.
      </p>
      <a href={`/events/${eventId}`} className="mt-4 inline-block text-sm text-accent underline">
        Try again
      </a>
    </div>
  );
}
