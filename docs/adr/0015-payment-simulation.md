# 0015 — Payment simulation: explicit outcome, not hidden randomness

## Context

The challenge requires a simulated payment covering both confirmation and refusal, with no real transaction. A tempting shortcut is to fake this with randomness (e.g. "10% of payments fail") or a magic input (e.g. "a card number ending in an even digit declines"). Both make the decline path hard for a reviewer to reach on demand, and hide the actual decision behind an opaque rule they'd have to reverse-engineer from the code.

## Decision

`POST /payments` takes an explicit `outcome: APPROVE | DECLINE` (`PaymentOutcome` enum in `packages/contracts`), chosen by the customer. The checkout UI (Fase 6) surfaces this as two buttons — "Confirm payment" and "Simulate decline" — rather than a card form whose outcome is secretly predetermined. `PaymentsService.pay()` dispatches on this value through the same lookup-map pattern as everywhere else in the codebase (ADR 0012), not an if/else.

- **APPROVE**: atomically claims the reservation (`PENDING` → `CONFIRMED`), records an `APPROVED` `Payment`, and issues one `Ticket` per held seat / per general-admission quantity unit via `TicketsService.issueForReservation()`.
- **DECLINE**: atomically claims the reservation (`PENDING` → `CANCELLED`), releases the held seat/stock immediately through the same `AllocationStrategy.release()` used by the expiry sweep (ADR 0006) — a decline does not wait for the hold to time out — and records a `DECLINED` `Payment` with a fixed `declineReason`. No tickets are issued.

Both paths share one `claimReservationOrThrow()` helper that performs the atomic conditional `UPDATE ... WHERE status = 'PENDING'` and, on a zero-row match, disambiguates *why* between three causes (in order): a `Payment` already exists for this reservation (idempotency — a duplicate/double-click request), the reservation's hold already expired, or it is in some other non-`PENDING` state. Each maps to a distinct `ErrorCode` (`PAYMENT_ALREADY_PROCESSED`, `RESERVATION_EXPIRED`, `RESERVATION_NOT_PENDING`) instead of one generic failure.

## Alternatives considered

- **Random success/failure**: unpredictable for whoever is evaluating the submission — they cannot deliberately exercise the decline path, and a flaky-looking failure during review reads as a bug, not a feature. Rejected.
- **A "magic" card number/field that triggers decline**: still deterministic, but undocumented magic is exactly the kind of decision the challenge asks *not* to hide — an explicit outcome field is the same determinism made legible.
- **A real payment provider's test/sandbox mode** (explicitly allowed by the challenge): more realistic, but adds an external account dependency and a second set of test credentials to document, for a requirement that is satisfied just as well by an explicit, in-house simulation. Revisit only if a differentiator is needed beyond what this project already covers.

## Consequences

- Idempotency is enforced twice: a pre-check before entering the transaction (fast path, avoids opening a transaction for the common case) and the atomic conditional `UPDATE` inside it (correctness under a genuine race between two near-simultaneous payment requests for the same reservation).
- Because decline releases inventory synchronously, a customer who declines and immediately retries checkout sees the seat/slot available again with no wait — verified in `payments.service.spec.ts`.
