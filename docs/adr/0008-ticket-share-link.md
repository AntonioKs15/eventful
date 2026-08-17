# 0008 — Ticket share link

## Context

A customer must be able to share a ticket via a link (e.g. to hand it to whoever is actually attending). The link's access model is intentionally simple — "anyone with the link can view this ticket" — the same trust model as a Google Docs share link, which matches the real use case (the customer is deliberately handing the ticket off).

## Decision

Every `Ticket` has a `qrPublicCode` — a random, high-entropy identifier (nanoid) — distinct from the `ticketId` + HMAC signature encoded in the actual scannable QR image (ADR 0007). The public route `GET /tickets/share/:qrPublicCode` is unauthenticated and returns the ticket's public view (event, seat/quantity, status), but never the gate-validation QR payload's signing material.

Keeping these two codes separate matters: `qrPublicCode` is designed to be shared (it is the whole point of this feature), while the gate-validation payload must never appear anywhere a person other than the ticket holder scanning it at the door would see it. If they were the same value, sharing a ticket would hand out its gate-admission code too.

## Alternatives considered

- **Require authentication to view a shared ticket**: more secure, but breaks the actual use case (sharing with someone who does not have — and should not need — an account on the platform) and is not requested by the challenge.
- **Reuse the gate-validation code as the share code**: rejected for the reason above — it would let anyone the link is forwarded to also let themselves in at the gate before the intended holder.

## Consequences

- Anyone who obtains the link can view the ticket; this is a deliberate, documented trade-off, not an oversight.
- `qrPublicCode` never grants gate entry by itself, so link-sharing and gate-admission security are fully decoupled.
