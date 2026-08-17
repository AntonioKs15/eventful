# 0013 — Package manager and repository layout: pnpm workspaces monorepo

## Context

The frontend and backend share several concerns that would otherwise drift apart if built as two unrelated repositories: enums (`UserRole`, `EventLayoutType`, ...), the `ErrorCode` list, and the pagination envelope shape all need to be the *same* values on both sides, or the frontend's error-lookup map (ADR 0010) silently falls out of sync with what the API actually sends.

## Decision

A single repository, pnpm workspaces, three workspace groups:

- `apps/web` — Next.js frontend
- `apps/api` — NestJS backend
- `packages/contracts` — enums, Zod schemas, and the pagination/error types imported by both apps

pnpm specifically (not npm/yarn workspaces): fast, disk-efficient (content-addressable store, relevant since this repo installs two full application dependency trees), and its stricter node_modules layout catches accidental undeclared-dependency usage that npm/yarn would silently allow via hoisting.

## Alternatives considered

- **Two separate repositories (frontend, backend)**: mirrors how many real deployments are split, but forces publishing `packages/contracts` as a versioned package (or hand-copying types) to share it — meaningfully more process for a single-developer challenge submission with a one-week-scale timeline, and the evaluator explicitly benefits from a single `git clone` to review everything end-to-end.
- **npm workspaces**: works and needs no extra tooling install, but was passed over in favor of pnpm's install performance and stricter dependency isolation, given no requirement favors npm specifically.
- **A shared types file duplicated (copy-pasted) into both apps instead of a package**: rejected outright — this is exactly the kind of silent-drift risk `packages/contracts` exists to eliminate.

## Consequences

- Any change to a shared enum or error code is made once, and both apps' typechecking immediately surfaces every place that needs updating — there is no manual "remember to also update the other app" step.
- CI/local commands that operate on "everything" (lint, test) run through pnpm's `--recursive`/`--filter` rather than a separate script per app.
- Prisma still generates its own enum types from `schema.prisma` (`@prisma/client`'s `UserRole`, `EventStatus`, ...), separate from the hand-written ones in `packages/contracts` — the frontend cannot depend on `@prisma/client` (a backend-only package with native bindings), so the enums cannot be the same TypeScript declaration, only the same string values, kept in lockstep by convention (the Prisma enum members are written to match the contracts enum members exactly). Reading a Prisma row into an API response therefore passes its enum fields through `castPrismaEnum<T>()` (`apps/api/src/common/utils/prisma-enum.util.ts`) once, at the repository/service boundary — a single, named, greppable conversion point instead of an unexplained cast scattered at every call site.
