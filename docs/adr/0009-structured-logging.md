# 0009 — Structured logging: Pino

## Context

The API must log in structured JSON with level, timestamp, a request-correlating context, and the message — usable by any log aggregator, and searchable during manual debugging of the concurrency-sensitive endpoints (ADR 0005).

## Decision

`nestjs-pino` (Pino under Nest's logger interface). A middleware assigns a `requestId` (reusing an inbound `x-request-id` header if present, generating one otherwise) and Pino's async-local-storage-backed context binds it to every log line emitted while handling that request — including from deep inside a service, without threading the id through every function signature manually. Log lines are JSON by default in production; pretty-printed only in local development via `pino-pretty`.

## Alternatives considered

- **Winston**: equally capable and widely used, but structured JSON output and request-scoped context binding both require assembling extra formatters/middleware by hand; Pino provides both as first-class, low-overhead defaults, and its NestJS integration (`nestjs-pino`) wires the request-id context automatically.
- **`console.log` with manual JSON.stringify**: technically satisfies "structured JSON," but gives up log levels, child-logger context binding, and performance — rejected as it would just be reimplementing a worse version of what Pino already provides.

## Consequences

- Every log call goes through the injected logger, never `console.log` directly — enforced by lint review, since nothing in the language stops a stray `console.log`.
- The `requestId` is also returned in the standardized error response's `details` (ADR 0010) so a reviewer reporting a bug can point at one log line.
