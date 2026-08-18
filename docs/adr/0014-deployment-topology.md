# 0014 — Deployment topology: Vercel + Render + Neon

## Context

Every other cross-cutting decision in this project already has a number (ADR 0001–0013, 0015,
0016); this one was left open in the README pending an actual deployment target. The app was
already built to make this close to a non-decision at the code level:

- `apps/api/src/config/env.validation.ts` requires `CORS_ORIGIN`, `DATABASE_URL`,
  `JWT_ACCESS_SECRET`, `QR_HMAC_SECRET`, etc. at boot and fails fast if any are missing — there is
  no code path that silently runs with defaults in production.
- `apps/api/src/main.ts` calls `app.enableCors({ origin: appConfig.corsOrigin, credentials: true })`
  with one explicit origin, not a wildcard — a prerequisite for the browser to accept a
  cross-origin cookie at all.
- `apps/api/src/auth/security/refresh-cookie.util.ts` already sets
  `sameSite: 'none', secure: true` on the refresh-token cookie whenever `NODE_ENV=production` —
  exactly what a cookie needs to survive a request from `*.vercel.app` to a different Render
  domain.
- Neon is already the Postgres used for both local development and (per ADR 0002) production.

So this ADR is mostly about *where* the two apps run and how their production URLs get wired into
the env vars above — not new application logic.

## Decision

- **Web → Vercel.** Next.js's own platform; zero servers to manage, and the brief already mandates
  Next.js (ADR — see the stack table in `README.md`).
- **API → Render**, as a Docker web service built from `apps/api/Dockerfile`
  (`docker-context: .` — the repo root, since the pnpm workspace lockfile lives there), deployed
  via the `render.yaml` blueprint at the repo root (config-as-code, not manual dashboard clicking).
  `prisma migrate deploy` runs as Render's **pre-deploy command**
  (`pnpm --filter @eventful/api prisma:deploy`), not baked into the container's `CMD` — if Render
  ever scales the API to more than one instance, a migration embedded in every container's startup
  would race; a single pre-deploy step runs once, before the new release takes traffic.
- **Postgres → Neon**, reaffirming ADR 0002's existing choice for the production topology
  specifically (not re-litigated here).
- Production URL wiring: Render's `CORS_ORIGIN` env var is set to the live Vercel URL
  (`https://<project>.vercel.app`); Vercel's `NEXT_PUBLIC_API_URL` is set to the live Render URL
  (`https://<service>.onrender.com`).

## Alternatives considered

- **Railway instead of Render**: also a valid Docker host with Git-based deploys; passed over only
  because Render's `render.yaml` blueprint format is marginally more documented for "Dockerfile
  lives in a subfolder of a monorepo" than Railway's equivalent — no functional requirement of this
  project favors one over the other, so this is a close call, recorded as such rather than
  over-justified.
- **Vercel serverless functions for the API** (instead of a separate Render service): rejected
  because `@nestjs/schedule` runs the reservation-expiry sweep (ADR 0006) as a long-lived
  in-process timer. A serverless function has no persistent process between invocations, so the
  sweep would never fire — this alone rules out any serverless host for the API as it exists today.
- **Self-hosted Docker on a bare VPS** (all three services on one box): rejected — pushes TLS
  certificate management, OS patching, and horizontal scaling onto a single developer for a
  challenge submission, with no requirement that demands it.
- **Committing real secret values into `render.yaml`**: rejected outright; every secret
  (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `QR_HMAC_SECRET`, `TICKETMASTER_API_KEY`) is declared with
  `sync: false` in the blueprint and filled in through the Render dashboard instead.

## Consequences

- Two independent deploy pipelines: Vercel auto-deploys `apps/web` on push to the connected
  branch; Render auto-deploys `apps/api` from `render.yaml` + `apps/api/Dockerfile` on the same
  trigger. Neither app needs to know the other was redeployed — they only share the two env vars
  above.
- `prisma migrate deploy` is a step in Render's release process, not a command a human runs by hand
  before each production release — a schema change ships the moment its migration file is merged,
  same as ADR 0002 already implies.
- **Vercel preview deployments get a fresh, random origin per PR/branch.** `CORS_ORIGIN` on Render
  only ever points at the one production Vercel URL, so preview deployments will get CORS errors
  calling the live API. Documented here as a known limitation (same spirit as the README's existing
  "Known limitations" section) rather than solved by this pass — fixing it would mean either a
  wildcard-subdomain CORS policy on Render (weakens the "explicit origin" guarantee this ADR relies
  on) or a second staging API, both out of scope for this challenge.
- The monorepo means neither host can be pointed at the repo root as-is: Render's Docker context is
  the repo root but its Dockerfile lives at `apps/api/Dockerfile`; Vercel's project root is
  `apps/web` but its install/build commands must still resolve the pnpm workspace from the repo
  root (`apps/web/vercel.json`) — both are one-time project-settings concerns, not ongoing
  maintenance.
