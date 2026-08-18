# 0016 — Gate validation: one endpoint, one payload, for camera and manual entry

## Context

The challenge requires the gate to validate a ticket both by scanning its QR with a camera and by typing a code in manually as a fallback, with a clear result: valid, invalid, already used, or wrong event. It also requires that the same ticket can never be validated twice.

## Decision

`POST /gate/validate` takes `{ eventId, payload }`, where `payload` is the exact string encoded in the QR image — `ticketId.signature` (ADR 0007) — regardless of whether it was decoded from a camera frame or typed by hand. There is no separate, shorter "manual code": typing the QR payload manually is treated as literally the same input through literally the same code path, which is what "converge on the same endpoint" (the plan's own framing) means taken at face value — one validation function, two ways to get a string into it.

`GateService.validate()` resolves to one of four outcomes via `GateValidationResult`, in this order:
1. Payload doesn't parse, or its signature doesn't verify → `NOT_FOUND`, with no ticket data returned.
2. Signature is authentic but no ticket with that id exists (should not happen in practice, but is treated identically to "signature invalid" rather than trusted blindly) → `NOT_FOUND`.
3. Ticket exists and is authentic, but its `eventId` doesn't match the gate's scoped event → `WRONG_EVENT`, ticket details returned (safe to reveal — the QR was already proven authentic at this point).
4. Ticket matches the event: an atomic `UPDATE tickets SET status='USED', usedAt=now() WHERE id=? AND status='ISSUED'` either claims it (`VALID`) or, if it was already claimed, fails with zero rows (`ALREADY_USED`) — the same check-and-write-as-one-statement pattern as reservation concurrency (ADR 0005), verified with the same kind of concurrent-request test: 10 simultaneous scans of one ticket yield exactly one `VALID`.

Steps 1 and 2 are deliberately collapsed into the identical response — same `NOT_FOUND` result, same `ticket: null`, no field that would let someone distinguish "you guessed a real ticket id with the wrong signature" from "that id doesn't exist." This is the anti-forgery-oracle property the QR signing exists for (ADR 0007) — it only holds if the API never leaks a signal that narrows the search space.

## Alternatives considered

- **A separate, short manual-entry code distinct from the QR payload** (e.g. a 6-character alphanumeric code): friendlier to type, and how some real ticketing systems do it. Rejected for this scope — it would mean maintaining a second unforgeable identifier per ticket (with its own entropy/collision considerations) for a fallback path that, in the one-week scope of this challenge, is exercised far less than the primary camera flow. Noted as a reasonable enhancement if this were headed to production.
- **Different endpoints for camera vs. manual entry**: the plan's requirement is that both converge — splitting them would just be the same logic duplicated behind two routes for no behavioral difference.

## Consequences

- The manual-entry fallback is exact but not ergonomic: a gate worker without a working scanner is typing a ~90-character string. Documented as a known trade-off in the README rather than hidden.
- Because both entry methods produce the same request shape, `GateService` has no branch for "how was this scanned" — one code path, one set of tests, covering both real usage modes.
