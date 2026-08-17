# 0006 — Reservation hold expiry

## Context

A reservation is created `PENDING` before payment is confirmed, holding a seat (via `ReservationSeat`) or general-admission stock (via the `sold` counter) so a second customer cannot grab the same inventory mid-checkout. If a customer abandons checkout, that hold must eventually be released, or inventory silently disappears.

## Decision

Every `Reservation` carries `expiresAt`. A scheduled sweep job (`@nestjs/schedule`, `ReservationExpiryScheduler`), running on a short fixed interval, finds `PENDING` reservations past `expiresAt` and, in one transaction per reservation: deletes its `ReservationSeat` rows (freeing the seat — the unique constraint in ADR 0005 is what makes this deletion sufficient to make the seat available again) or decrements the general-admission `sold` counter, then marks the reservation `EXPIRED`.

## Alternatives considered

- **Redis with a TTL-based lock/key per seat**: the standard production answer to "release this hold automatically," and more precise (expiry happens exactly on time rather than on the next sweep tick). Introduces a second stateful system for a single, well-understood job that a short-interval SQL sweep already performs correctly at this scale. Rejected for this scope and **documented as a known simplification in the README** — a sweep interval of, e.g., 30 seconds means a released hold can be up to ~30 seconds late, which is acceptable for a checkout hold window measured in minutes.
- **Release on next read (lazy expiry)**: checking `expiresAt` at read time instead of sweeping avoids a background job, but then an expired seat still shows as unavailable to everyone else until someone happens to read it, which is worse for the "can I grab this seat now" experience than a proactive sweep.

## Consequences

- The sweep job must itself be race-safe against a customer completing payment at the same moment it fires — payment confirmation (ADR handled in the reservations/payments service) claims the reservation with a conditional `UPDATE ... WHERE status = 'PENDING'`, so the sweep and a late-arriving payment cannot both "win."
- This is explicitly called out in the README's known-limitations section rather than left for a reviewer to discover.
