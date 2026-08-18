# Eventful — Events & Ticketing Platform

An organizer publishes events (built manually or from the Ticketmaster Discovery catalog), a
customer reserves a seat or general-admission spot, pays (simulated), and receives a QR ticket
that can be shared by link. Gate staff validate tickets at the door, by camera or manual entry,
with a hard guarantee that no seat sells twice and no ticket validates twice.

Built for the Verzel Elite Dev challenge (`Desafio-Elite-Dev-2026.pdf`).

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router) + React 19 | Required by the brief |
| Backend | NestJS | [ADR 0001](docs/adr/0001-backend-framework.md) |
| Database | PostgreSQL (Neon) | [ADR 0002](docs/adr/0002-database-and-migrations.md) |
| ORM | Prisma | [ADR 0002](docs/adr/0002-database-and-migrations.md) |
| Pagination | Offset/limit, `{ data, meta }` | [ADR 0003](docs/adr/0003-pagination-strategy.md) |
| Auth | JWT access (15 min, memory) + rotating opaque refresh (httpOnly cookie) | [ADR 0004](docs/adr/0004-auth-token-strategy.md) |
| Concurrency | Atomic conditional `UPDATE`s + unique constraints, no external lock service | [ADR 0005](docs/adr/0005-seat-and-stock-concurrency.md) |
| Reservation expiry | Scheduled sweep, timestamp-based | [ADR 0006](docs/adr/0006-reservation-hold-expiry.md) |
| Ticket anti-forgery | HMAC-signed QR payload | [ADR 0007](docs/adr/0007-qr-anti-forgery.md) |
| Ticket sharing | Public opaque code, distinct from the gate code | [ADR 0008](docs/adr/0008-ticket-share-link.md) |
| Logging | Structured JSON via `nestjs-pino`, `requestId` on every line and error response | [ADR 0009](docs/adr/0009-structured-logging.md) |
| Errors | Single global filter, closed `ErrorCode` enum | [ADR 0010](docs/adr/0010-error-contract.md) |
| External catalog | Backend-only proxy with cache, Ticketmaster Discovery | [ADR 0011](docs/adr/0011-external-catalog-integration.md) |
| Seat/GA allocation | Strategy pattern via `Record<EventLayoutType, …>` lookup map | [ADR 0012](docs/adr/0012-allocation-strategy-pattern.md) |
| Monorepo | pnpm workspaces | [ADR 0013](docs/adr/0013-package-manager-and-monorepo.md) |
| Payment | Explicit simulated approve/decline, no hidden randomness | [ADR 0015](docs/adr/0015-payment-simulation.md) |
| Gate validation | One endpoint, one payload shape for camera and manual entry | [ADR 0016](docs/adr/0016-gate-validation-endpoint.md) |

Full ADR index: [`docs/adr/`](docs/adr/).

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (repo pins `pnpm@11.22.0` via `packageManager`)
- A PostgreSQL 16 database — either:
  - a free [Neon](https://neon.tech) project (used for both local development and production in
    this build, since Docker wasn't available in the dev environment — see below), or
  - `docker compose up -d` if you have Docker installed (`docker-compose.yml` is provided and
    matches the schema exactly; either path runs the identical Prisma migrations, so there is no
    behavioral difference between them)
- A [Ticketmaster Discovery API](https://developer.ticketmaster.com/) consumer key (free tier is
  enough) if you want the organizer's "From Ticketmaster" catalog search to return real results —
  the rest of the app works without it

## Local setup

```bash
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edit apps/api/.env: set DATABASE_URL (Neon or local Docker Postgres),
# generate real values for JWT_ACCESS_SECRET and QR_HMAC_SECRET, and
# optionally set TICKETMASTER_API_KEY

pnpm prisma:migrate   # applies all committed migrations
pnpm prisma:seed      # seeds the four users below + two published events

pnpm dev              # runs apps/web (3000) and apps/api (3333) together
```

`pnpm dev:api` / `pnpm dev:web` run either app alone. `pnpm test` and `pnpm lint` run every
workspace's suite (backend: Jest + Supertest, including the concurrency e2e tests under
`apps/api/test/`; frontend: Vitest + React Testing Library).

### Seeded accounts

All seeded users share the password `ChangeMe123!`.

| Email | Role | Name |
| --- | --- | --- |
| `organizer@eventful.test` | Organizer | Olivia Organizer |
| `customer1@eventful.test` | Customer | Carlos Customer |
| `customer2@eventful.test` | Customer | Camila Customer |
| `gate@eventful.test` | Gate | Gil Gatekeeper |

The seed also publishes two events owned by Olivia: **The Life Comedy** (assigned seating, 5×8
grid) and **Summer Sound Festival** (general admission, capacity 200) — enough to exercise both
allocation strategies end to end without creating anything by hand.

### API docs

Swagger UI is served at `http://localhost:3333/docs` once the API is running.

### Health check

`GET /health` reports `{ status: "ok" | "degraded" }` — it reflects live database reachability
without crashing the process on a transient outage (see the note in
[ADR 0002](docs/adr/0002-database-and-migrations.md)).

## Deployment

Target: Vercel (web) + Render/Railway (API) + Neon (Postgres) — the whole app is already
environment-variable-driven for exactly this. Deployment itself hasn't shipped yet; when it does,
its topology and the resulting cross-origin cookie decisions will be written up as ADR 0014 and
linked here.

## Known limitations

- **Seat maps are a simple rectangular grid** (`rows × columns`) with no curved rows or numbered
  sections — a real venue's seating chart is a separate, larger problem than this challenge scope
  calls for.
- **Reservation holds expire via a scheduled sweep on a timestamp column**, not a TTL store like
  Redis — simpler given the single-datastore decision in ADR 0002, at the cost of expiry being
  precise only to the sweep interval rather than instantaneous. See
  [ADR 0006](docs/adr/0006-reservation-hold-expiry.md).
- **The external catalog integration only implements Ticketmaster Discovery**, not a second
  provider — the challenge asked for one external source, and Ticketmaster's response already
  includes venue, date, and price data without needing a second call.
- **Camera QR scanning depends on real camera hardware and a user permission grant**; it was
  built and code-reviewed against `@zxing/browser`'s documented API and exercised manually, but
  could not be exhaustively tested against physical scan conditions (lighting, printed vs. screen
  codes) in this environment. Manual code entry is a first-class fallback, not an afterthought,
  and shares the exact same validation endpoint and result states.

## AI usage

See [`docs/ai-usage.md`](docs/ai-usage.md) for what was AI-assisted, what was a deliberate human
decision point, and why.
