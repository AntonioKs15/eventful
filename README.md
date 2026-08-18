# Eventful — Events & Ticketing Platform

An organizer builds a movie catalog (from TMDb or by hand) and schedules showtimes at a venue
(from Ticketmaster Discovery or by hand); a customer browses what's playing, reserves a seat or
general-admission spot, pays (simulated), and receives a QR ticket that can be shared by link.
Gate staff validate tickets at the door, by camera or manual entry, with a hard guarantee that no
seat sells twice and no ticket validates twice.

Built for the Verzel Elite Dev challenge (`Desafio-Elite-Dev-2026.pdf`).

## Live demo

- **App**: https://eventful-web-five.vercel.app
- **API**: https://eventful-api-kibo.onrender.com ([`/docs`](https://eventful-api-kibo.onrender.com/docs) for Swagger, [`/health`](https://eventful-api-kibo.onrender.com/health) for liveness)

Deployed per [ADR 0014](docs/adr/0014-deployment-topology.md) (Vercel + Render + Neon). Use any of
the [seeded accounts](#seeded-accounts) below to log in — password `ChangeMe123!` for all of them.
The API's free-tier Render instance spins down after inactivity, so the first request after a
while can take up to ~30s to wake it back up.

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
| External catalog | Backend-only proxy with cache, Ticketmaster Discovery + TMDb | [ADR 0011](docs/adr/0011-external-catalog-integration.md) |
| Seat/GA allocation | Strategy pattern via `Record<EventLayoutType, …>` lookup map | [ADR 0012](docs/adr/0012-allocation-strategy-pattern.md) |
| Monorepo | pnpm workspaces | [ADR 0013](docs/adr/0013-package-manager-and-monorepo.md) |
| Payment | Explicit simulated approve/decline, no hidden randomness | [ADR 0015](docs/adr/0015-payment-simulation.md) |
| Gate validation | One endpoint, one payload shape for camera and manual entry | [ADR 0016](docs/adr/0016-gate-validation-endpoint.md) |
| Deployment | Vercel (web) + Render (API, Docker) + Neon (Postgres) | [ADR 0014](docs/adr/0014-deployment-topology.md) |

Full ADR index: [`docs/adr/`](docs/adr/).

## Prerequisites

- Node.js ≥ 22.13 (the pinned `pnpm@11.22.0` refuses to run on anything older)
- pnpm ≥ 9 (repo pins `pnpm@11.22.0` via `packageManager`)
- A PostgreSQL 16 database — either:
  - a free [Neon](https://neon.tech) project (used for both local development and production in
    this build, since Docker wasn't available in the dev environment — see below), or
  - `docker compose up -d` if you have Docker installed (`docker-compose.yml` is provided and
    matches the schema exactly; either path runs the identical Prisma migrations, so there is no
    behavioral difference between them)
- A [Ticketmaster Discovery API](https://developer.ticketmaster.com/) consumer key (free tier is
  enough) if you want the organizer's "From Ticketmaster" showtime search to return real results —
  the rest of the app works without it
- A [TMDb API key](https://developer.themoviedb.org/docs/getting-started) (free, v3 `api_key`) if
  you want the organizer's "From TMDb" movie search to return real results — same fallback: the
  rest of the app, including manually created movies, works without it

## Local setup

```bash
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edit apps/api/.env: set DATABASE_URL (Neon or local Docker Postgres),
# generate real values for JWT_ACCESS_SECRET and QR_HMAC_SECRET, and
# optionally set TICKETMASTER_API_KEY and/or TMDB_API_KEY

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

The seed also publishes: two movies (**Black Panther**, now playing, with cast; **The Marvels**,
coming soon) owned by Olivia; a showtime for Black Panther at an assigned-seating venue (5×8 grid)
plus a general-admission **Summer Sound Festival** event, covering both allocation strategies end
to end; and, for Carlos, an already-issued ticket for that showtime plus a review for Black Panther
— so the review-eligibility gate (only ticket holders can review) has something to show on first
login instead of needing to be walked through by hand.

### API docs

Swagger UI is served at `http://localhost:3333/docs` once the API is running.

### Health check

`GET /health` reports `{ status: "ok" | "degraded" }` — it reflects live database reachability
without crashing the process on a transient outage (see the note in
[ADR 0002](docs/adr/0002-database-and-migrations.md)).

## Running the full stack in Docker (optional)

`docker-compose.yml` can also run the API and web app themselves, not just Postgres — useful for
exercising the exact images that ship to production without needing Neon, Render, or Vercel
accounts:

```bash
docker compose up --build
```

This builds `apps/api/Dockerfile` and `apps/web/Dockerfile`, runs `prisma migrate deploy`
automatically on API startup, and serves the API on `http://localhost:3333` and the web app on
`http://localhost:3000`. It uses fixed local secrets baked into `docker-compose.yml` — fine for a
throwaway local stack, never reused for a real deployment.

## Deployment

Topology: **Vercel** (web) + **Render** (API, deployed as a Docker web service from
`apps/api/Dockerfile` via the `render.yaml` blueprint) + **Neon** (Postgres). Full rationale,
alternatives considered, and the cross-origin cookie wiring in
[ADR 0014](docs/adr/0014-deployment-topology.md).

1. Push this repository to GitHub (both Render and Vercel deploy from a connected Git repo).
2. **API on Render**: in the Render dashboard, "New" → "Blueprint", point it at the repo — it
   reads `render.yaml` and creates the `eventful-api` web service. Fill in the secret env vars it
   leaves blank (`DATABASE_URL` from Neon, `JWT_ACCESS_SECRET` / `QR_HMAC_SECRET` as long random
   strings, optionally `TICKETMASTER_API_KEY` and/or `TMDB_API_KEY`); leave `CORS_ORIGIN` blank for
   now. Render builds
   the Docker image and starts the service; `prisma migrate deploy` runs automatically as part of
   the container's start command, before the API begins listening.
3. **Web on Vercel**: "Add New" → "Project", import the same repo, set **Root Directory** to
   `apps/web` and enable "Include files outside the root directory" (needed to resolve the pnpm
   workspace's `@eventful/contracts` package — `apps/web/vercel.json` handles the actual
   install/build commands). Set `NEXT_PUBLIC_API_URL` to the Render service's URL
   (`https://eventful-api.onrender.com`, or whatever Render assigned).
4. Back on Render, set `CORS_ORIGIN` to the live Vercel URL (`https://<project>.vercel.app`) and
   redeploy the API so the new value takes effect.
5. Verify: `https://<render-url>/health` returns `{"status":"ok"}`, `https://<render-url>/docs`
   loads Swagger, and the Vercel URL can log in (proves the cross-origin cookie round-trip works).

Vercel preview deployments (per-PR/branch URLs) are a known limitation here: they get a different
origin than the one `CORS_ORIGIN` is set to, so preview builds will hit CORS errors calling the
live API — see the Consequences section of ADR 0014.

## Known limitations

- **Seat maps are a simple rectangular grid** (`rows × columns`) with no curved rows or numbered
  sections — a real venue's seating chart is a separate, larger problem than this challenge scope
  calls for.
- **Reservation holds expire via a scheduled sweep on a timestamp column**, not a TTL store like
  Redis — simpler given the single-datastore decision in ADR 0002, at the cost of expiry being
  precise only to the sweep interval rather than instantaneous. See
  [ADR 0006](docs/adr/0006-reservation-hold-expiry.md).
- **TMDb genre names are resolved from a hardcoded id→name table**, not a live `/genre/movie/list`
  call — TMDb's genre list is small, stable, and publicly documented, so this trades a rare future
  drift for one fewer network call on every catalog search.
- **Camera QR scanning depends on real camera hardware and a user permission grant**; it was
  built and code-reviewed against `@zxing/browser`'s documented API and exercised manually, but
  could not be exhaustively tested against physical scan conditions (lighting, printed vs. screen
  codes) in this environment. Manual code entry is a first-class fallback, not an afterthought,
  and shares the exact same validation endpoint and result states.

## AI usage

See [`docs/ai-usage.md`](docs/ai-usage.md) for what was AI-assisted, what was a deliberate human
decision point, and why.
