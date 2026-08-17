# 0012 — Allocation Strategy pattern for SEATED vs. GENERAL_ADMISSION

## Context

An event is either `SEATED` (customer picks a specific seat from a grid) or `GENERAL_ADMISSION` (customer picks a quantity against shared capacity) — decided once, at event creation, by the organizer. Reservation, release-on-expiry, and ticket issuance all need to behave differently depending on which mode an event uses. The project's code rules explicitly forbid chained/nested `if`/`else` for this kind of branching.

## Decision

An `AllocationStrategy` interface (`reserve(event, input)`, `release(reservation)`) with two implementations, `SeatedAllocationStrategy` and `GeneralAdmissionAllocationStrategy`, each owning exactly one concurrency mechanism from ADR 0005. They are resolved through a lookup map, not a conditional:

```ts
const strategies: Record<EventLayoutType, AllocationStrategy> = {
  [EventLayoutType.SEATED]: seatedAllocationStrategy,
  [EventLayoutType.GENERAL_ADMISSION]: generalAdmissionAllocationStrategy,
};
```

injected into `ReservationsService`, which calls `strategies[event.layoutType].reserve(...)` — adding a third layout type later would mean adding one map entry and one class, touching zero existing branches. The same lookup-map-over-conditional shape is reused for the gate's four-outcome result (`GateValidationResult`), for mapping `ErrorCode` to HTTP status in the exception filter (ADR 0010), and one step earlier than reservation: `buildEventAllocationData()` (`apps/api/src/events/builders/event-allocation-data.builder.ts`) picks the `SeatMap`-vs-`GeneralAdmissionPool` nested-create payload at event-creation time through the identical `Record<EventLayoutType, ...>` shape — this pattern is the project's standing answer to "avoid nested/chained ifs," applied everywhere the same shape of problem shows up, not only in reservation allocation.

## Alternatives considered

- **`if (event.layoutType === EventLayoutType.SEATED) { ... } else { ... }` inline in the service**: works for two cases, but is exactly the branching style the project's rules prohibit, and does not scale to a third layout type without editing every call site.
- **Single unified allocation function with internal branching per field (`seatId` vs `quantity`)**: keeps one class but pushes the same conditional complexity inside it instead of removing it, and makes the two genuinely different concurrency mechanisms (ADR 0005) harder to test in isolation.

## Consequences

- Each strategy is unit-testable independently, including its own concurrency test (ADR 0005's parallel-request tests), without needing to also exercise the other layout type.
- `ReservationsService` itself contains no knowledge of *how* seats vs. stock are held — only that it asks the strategy for the current event and awaits a result, which is what keeps it free of nested conditionals.
