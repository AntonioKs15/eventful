# 0017 — Subscription billing: a real gateway, scoped to just the subscription

## Context

The product gained a monthly subscription: for a recurring fee, a customer can redeem up to 2
tickets a month for free, resetting every billing cycle with no rollover. Unlike the rest of the
checkout (ADR 0015), this was an explicit, deliberate choice by whoever is directing the work to
use **real recurring billing** instead of another in-house simulation — asked directly, and
answered directly, rather than defaulted into.

ADR 0015 already flagged this exact fork in the road and left it open: *"A real payment
provider's test/sandbox mode: more realistic, but adds an external account dependency... Revisit
only if a differentiator is needed beyond what this project already covers."* A subscription with
a real billing cycle, a real renewal event, and a real cancellation flow is that differentiator —
a `PaymentOutcome.APPROVE | DECLINE` toggle has no meaningful way to simulate "renews every 30
days" or "the card on file stopped working" without reinventing a scheduler and a fake ledger that
would be less convincing than just using the thing built for this.

## Decision

**Stripe**, in test mode, via **Stripe Checkout** (hosted signup) and the **Stripe Billing
Portal** (hosted management/cancellation) — not a self-built card form or cancellation UI.

- `POST /subscriptions/checkout-session` creates a Stripe Checkout Session
  (`mode: "subscription"`) tied to the caller via `client_reference_id`, and redirects the
  customer to Stripe's own hosted page. No card data or Stripe.js ever touches this app.
- `POST /subscriptions/portal-session` creates a Billing Portal session for the customer's
  existing Stripe customer id and redirects there for cancellation or payment-method changes —
  Stripe already builds and maintains that flow; re-implementing "cancel a subscription" as a
  first-party feature would just be worse, later, undocumented Stripe functionality.
- `POST /subscriptions/webhook` (public, raw-body, signature-verified via
  `stripe.webhooks.constructEvent`) is the **only** place subscription state changes: on
  `checkout.session.completed` the local `Subscription` row is created with 2 free tickets; on
  `invoice.paid` (a renewal) the counter resets to 2 and the period is refreshed; on
  `invoice.payment_failed` the status flips to `PAST_DUE`; on `customer.subscription.updated` /
  `.deleted` the local status and `cancelAtPeriodEnd` flag are kept in sync. The redirect back
  into the app after checkout is UX only — it never itself grants the subscription.
- Redeeming a free ticket is a **new way to settle an existing reservation**, not a new
  reservation flow: `PaymentsService.redeemWithSubscription()` sits next to `pay()` in the same
  module, reusing the exact same atomic reservation-claim helper (ADR 0012's dispatch pattern
  doesn't apply here since there's only one outcome, but the claim-then-act shape is identical),
  then calls `SubscriptionsService.consumeFreeTickets()` — an atomic conditional
  `UPDATE ... WHERE status = 'ACTIVE' AND freeTicketsRemaining >= quantity` — inside the same
  Prisma transaction that issues the tickets. If the balance is insufficient, the whole
  transaction rolls back: no seat or ticket is ever issued without a matching decrement.

## Alternatives considered

- **Extending the existing `PaymentOutcome` simulation to a third "subscription" outcome**:
  rejected. A subscription has a billing *cycle* — renewal dates, a payment-failure state, a
  cancellation that takes effect at period end — that a one-shot `APPROVE`/`DECLINE` choice has no
  natural way to represent without bolting on a fake clock and a fake dunning process, at which
  point it's not simpler than using Stripe's real one.
- **Building first-party cancel/update-payment-method screens** instead of the Billing Portal:
  rejected for this scope — it's a full settings surface (payment methods, invoice history,
  proration) that Stripe already hosts, keeps PCI scope off this app entirely, and updates itself
  as Stripe's own UI improves.
- **A `webhook_events` table to record every processed Stripe event id for idempotency**:
  considered and deliberately skipped. Every webhook handler here is a upsert or a conditional
  `UPDATE` keyed by `stripeSubscriptionId`/`userId` — replaying the same event twice converges to
  the same state rather than double-applying an effect (e.g. `freeTicketsRemaining` is *set* to 2
  on renewal, never incremented). That's sufficient for Stripe's automatic retry behavior at this
  scope; a dedicated ledger would only earn its cost if a handler needed to react to an event
  exactly once regardless of final state (e.g. an audit log), which none of these do.

## Consequences

- This app now holds exactly one real external-payments dependency (`STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`) alongside the otherwise-simulated checkout — a
  narrower blast radius than swapping the whole payment story to a real gateway, and one that's
  easy to point at because it's the only place real money (test-mode, in this case) is modeled at
  all.
- `main.ts` boots with `rawBody: true` so the webhook route can verify Stripe's signature against
  the exact bytes Stripe sent, ahead of the global JSON body parser transforming anything — this
  is new infrastructure this codebase didn't need before (every other route only ever sees
  already-parsed JSON).
- Free-ticket redemption is bounded by the *number of tickets a reservation will actually issue*
  (`tickets.length`, resolved by `TicketsService.issueForReservation()`), not a hardcoded "1 per
  redemption" assumption — so a general-admission reservation for 2 seats correctly consumes both
  of the month's 2 free tickets in one redemption, exactly matching what a seated reservation for
  2 seats would consume.
