# 0005 — Preventing double-selling: seat and stock concurrency control

## Context

This is the challenge's core correctness requirement: "the same seat must never be sold twice." Two allocation modes exist (ADR 0012) with different natural units — a `GENERAL_ADMISSION` event sells against a shared capacity counter, a `SEATED` event sells individually identified seats. Both must be correct under concurrent requests, not just under sequential testing.

## Decision

**General admission** — a single conditional `UPDATE`:

```sql
UPDATE general_admission_pools
SET sold = sold + $qty
WHERE event_id = $eventId AND sold + $qty <= capacity
RETURNING *;
```

If zero rows come back, the request failed because capacity was exhausted (mapped to `INSUFFICIENT_CAPACITY`) — there is no read-then-decide window, because the check and the write are the same statement, evaluated atomically by Postgres.

**Seated** — an `INSERT` into `ReservationSeat` relying on its `@@unique([seatId])` constraint. A second concurrent attempt to hold the same seat hits a unique-violation (Prisma error `P2002`), which the service translates to `SEAT_ALREADY_TAKEN`. There is no `SELECT` to check availability before the `INSERT`; the constraint itself is the check.

Both paths run inside a Prisma `$transaction`, alongside creating the `Reservation` row, so a failed allocation never leaves an orphaned `PENDING` reservation.

## Alternatives considered

- **`SELECT ... FOR UPDATE` then `UPDATE`**: works, but requires reasoning explicitly about lock scope, transaction isolation level, and holding a row lock for the duration of the transaction — more moving parts to get right and to test than a single conditional statement, for the same outcome.
- **Optimistic locking (a `version` column, retry on conflict)**: fits "many readers, occasional conflicting writer" workloads. Here the workload is "first request to arrive should win, everyone else should get a clear, immediate rejection" — a conditional UPDATE and a unique constraint already deliver that with no retry loop needed.
- **Application-level mutex / distributed lock (e.g. Redis)**: adds an external system and a failure mode (lock service down = booking down) to solve a problem Postgres already solves transactionally. Rejected — see also ADR 0006 for the same reasoning applied to hold expiry.

## Consequences

- Concurrency correctness is verified with actual concurrent-request tests (Phase 3 of the implementation plan: N parallel general-admission bookings summing past capacity, two parallel seat holds on the same seat), not just sequential unit tests — a sequential test cannot prove either statement is atomic.
- `Ticket.@@unique([eventId, seatId])` (with `seatId` null for general-admission tickets, which Postgres treats as distinct) is a second, independent guard at the ticket-issuance step, so a bug in the reservation path alone could not still result in two issued tickets for the same seat.
