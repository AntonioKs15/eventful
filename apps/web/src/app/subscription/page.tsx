"use client";

import { SubscriptionStatus, UserRole } from "@eventful/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { formatEventDate, formatPriceCents } from "@/lib/format";
import {
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from "@/lib/subscriptions/subscription-status-presentation";
import {
  createCheckoutSession,
  createPortalSession,
  getMySubscription,
} from "@/lib/subscriptions/subscriptions-api";

const FREE_TICKETS_PER_CYCLE = 2;
const SUBSCRIPTION_PRICE_CENTS = 999;

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const justSubscribed = searchParams.get("checkout") === "success";

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", "me"],
    queryFn: getMySubscription,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => createCheckoutSession(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => createPortalSession(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  if (subscriptionQuery.isPending) {
    return (
      <p className="mx-auto max-w-xl px-6 py-16 text-surface-500">Loading your subscription…</p>
    );
  }

  const subscription = subscriptionQuery.data;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">Subscription</p>
        <h1 className="font-display text-4xl font-bold uppercase text-foreground">
          VisionMax Plus
        </h1>
        <p className="mt-1 text-surface-400">
          {FREE_TICKETS_PER_CYCLE} free tickets every month, on us.
        </p>
      </div>

      {justSubscribed ? (
        <div className="rounded-2xl border border-positive/40 bg-positive/10 p-4 text-sm text-positive">
          Subscription started! It can take a few seconds to show up below.
        </div>
      ) : null}

      <div className="ticket-stub rounded-2xl p-6">
        {subscription ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <StatusPill
                tone={subscriptionStatusTone(subscription.status)}
                label={subscriptionStatusLabel(subscription.status)}
              />
              <span className="font-display text-2xl font-bold text-foreground">
                {subscription.freeTicketsRemaining} / {FREE_TICKETS_PER_CYCLE}
              </span>
            </div>
            <p className="font-ticket text-sm text-foreground/70">
              Free tickets remaining this cycle.
              {subscription.status === SubscriptionStatus.ACTIVE
                ? ` Renews ${formatEventDate(subscription.currentPeriodEnd)}.`
                : null}
            </p>
            {subscription.cancelAtPeriodEnd ? (
              <p className="text-sm text-accent">
                Cancels on {formatEventDate(subscription.currentPeriodEnd)} — no further charges.
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
            >
              Manage subscription
            </Button>
            <ApiErrorNotice error={portalMutation.error} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="font-display text-2xl font-bold text-foreground">
              {formatPriceCents(SUBSCRIPTION_PRICE_CENTS)}
              <span className="text-sm font-normal text-surface-400"> / month</span>
            </p>
            <p className="font-ticket text-sm text-foreground/70">
              Redeem up to {FREE_TICKETS_PER_CYCLE} tickets a month for free, for any showtime.
              Cancel anytime.
            </p>
            <Button
              type="button"
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
            >
              Subscribe
            </Button>
            <ApiErrorNotice error={checkoutMutation.error} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <AuthGuard allow={[UserRole.CUSTOMER]}>
      <SubscriptionContent />
    </AuthGuard>
  );
}
