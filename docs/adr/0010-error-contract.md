# 0010 — Standardized error contract

## Context

The frontend must never invent its own error copy — every user-facing error message has to originate from the API, per the challenge's requirement, and it must be trivial for the frontend to render any error the same way regardless of which module raised it.

## Decision

Every error response — validation failures, domain errors (`SEAT_ALREADY_TAKEN`, `TICKET_ALREADY_USED`, ...), auth failures, unhandled exceptions — is normalized by a single global `GlobalExceptionFilter` to:

```json
{ "error": { "code": "SEAT_ALREADY_TAKEN", "message": "This seat has already been reserved.", "details": { "requestId": "..." } } }
```

`code` is always one value from the closed `ErrorCode` enum in `packages/contracts` — the same enum the frontend imports, so "does the frontend recognize this error" is a type-checked lookup (`Record<ErrorCode, ...>`, never an if/else on strings). Domain services throw typed exceptions (e.g. `SeatAlreadyTakenException extends DomainException`) carrying an `ErrorCode`; the filter's only job is mapping any thrown error — domain, validation-pipe, or truly unexpected — to this one shape and the matching HTTP status, and logging the unexpected ones with full detail server-side while returning a generic `INTERNAL_ERROR` to the client.

## Alternatives considered

- **Per-module ad hoc error responses**: what a codebase looks like with no decision made here — every controller free to shape its own error JSON. Explicitly what this ADR exists to avoid.
- **HTTP status code alone, no error body**: insufficient — the frontend needs to distinguish `SEAT_ALREADY_TAKEN` from `RESERVATION_EXPIRED` (both plausibly a 409), and a human-readable `message` the UI can display without a client-side string table duplicating the API's copy.

## Consequences

- Adding a new domain error means adding one `ErrorCode` value and one typed exception class — never a new response shape.
- The frontend's error-rendering component is a single lookup-map component, not per-screen error handling logic — see the Fase 6 quantity/seat picker notes in the implementation plan.
