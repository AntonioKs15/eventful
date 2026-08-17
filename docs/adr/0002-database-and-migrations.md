# 0002 — Database and migration strategy: PostgreSQL + Prisma

## Context

The stack mandates PostgreSQL and Prisma. Beyond the mandate, the domain needs real relational integrity (a seat can belong to at most one live reservation, a ticket references exactly one event) and, for the two hardest requirements — "never sell the same seat twice" and "never validate the same ticket twice" — needs atomic, race-safe writes rather than application-level locking.

## Decision

- PostgreSQL 16 as the only datastore (no secondary cache/store such as Redis — see ADR 0006 for why that trade-off is accepted).
- Prisma Migrate as the single source of schema truth: every schema change ships as a versioned migration file under `apps/api/prisma/migrations/`, committed to git.
- `prisma migrate dev` for local development (creates and applies migrations, keeps the dev database in sync with `schema.prisma`).
- `prisma migrate deploy` for every non-local environment (applies existing migrations only, never generates new ones) — this is what runs in the deploy pipeline (ADR 0014).
- `prisma db seed` (via `apps/api/prisma/seed.ts`) populates the four required test users, at least one published event, and its available tickets.

## Alternatives considered

- **`prisma db push`**: convenient for prototyping (syncs the schema without generating migration files), but produces no audit trail of how the schema evolved and is explicitly unsafe for a database that already holds data — rejected as the primary workflow, though it may be used transiently while iterating on a brand-new model before its first migration is generated.
- **Raw SQL migrations (e.g. `node-pg-migrate`)**: full control over generated DDL, but duplicates what Prisma Migrate already derives from `schema.prisma`, and would desynchronize the TypeScript types from the actual schema — rejected as unnecessary given Prisma is already mandated.

## Consequences

- Every schema change is a two-step commit in practice: edit `schema.prisma`, then run `prisma migrate dev --name <change>` to generate the migration — skipping the second step is a review smell, not a valid shortcut.
- Local development and hosted production (Neon) both run the exact same migration files, so "works on my machine" schema drift is not possible.
- Seat/ticket concurrency correctness (ADR 0005) is delegated to Postgres's own transactional guarantees (unique constraints, conditional UPDATEs) instead of an external lock service, which keeps the datastore list to one item.
- `PrismaService` does not eagerly call `$connect()` on module init: Prisma connects lazily on first query instead. An eager connect would crash the entire API process at boot if Postgres is briefly unreachable, which defeats `GET /health` reporting a `degraded` status — a transient DB outage should be observable, not fatal to the process.
