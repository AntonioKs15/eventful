# 0004 — Authentication and token strategy

## Context

The challenge requires three distinct roles and is explicit that credentials and tokens are managed entirely by the API — the frontend must only consume a session, never mint or validate a token itself. The Gate role is used for a long, continuous shift at a single door, so the session should not force a re-login every few minutes; the Customer/Organizer roles are used interactively in short bursts.

## Decision

- Password hashing with `argon2` (current OWASP-recommended default over bcrypt).
- Short-lived JWT **access token** (15 minutes), returned in the response body and held by the frontend only in memory (never `localStorage`/`sessionStorage`), carrying `sub` (user id) and `role`.
- Longer-lived **refresh token**, opaque and random (not a JWT), stored **hashed** in the `RefreshToken` table, delivered to the browser as an `httpOnly` cookie — inaccessible to frontend JavaScript by construction. Its `Secure`/`SameSite` attributes are environment-dependent, not a fixed `Strict`: the deploy topology (ADR 0014) puts the web app and the API on different domains (Vercel and Render/Railway), which is genuinely cross-site, so a `SameSite=Strict` or even `Lax` cookie would simply never be sent back to the API in production. In production the cookie is `SameSite=None; Secure` (the only combination browsers deliver cross-site, and `Secure` is required to pair with `None`); in local development, where the browser treats same-domain-different-port as same-site, it is `SameSite=Lax; Secure=false` (no HTTPS locally). This is decided once, from `NodeEnvironment`, not per request.
- Refresh is **rotating**: each use of a refresh token issues a new access + refresh pair and revokes the old refresh token row (`revokedAt`). Reusing an already-rotated refresh token is treated as a signal of theft and revokes the entire token family.
- All of the above — issuance, verification, expiry, rotation — lives in `apps/api/src/auth`. The frontend never decodes or inspects the JWT; it only reacts to 401 responses by calling the refresh endpoint.
- **Secure by default**: `JwtAuthGuard` and `RolesGuard` are registered globally (`APP_GUARD`), so every route requires a valid access token unless explicitly opted out with `@Public()`, and every route additionally requires role membership once annotated with `@Roles(...)`. The alternative — applying `@UseGuards(JwtAuthGuard)` per controller — fails open: a route is unprotected until someone remembers to guard it. Global-by-default with an explicit opt-out fails closed instead, which matters here because a missed guard on, say, the organizer's event-management routes would let any authenticated customer edit someone else's event.

## Alternatives considered

- **Server-side sessions (cookie + session store)**: simpler mental model, but requires a shared session store the moment there is more than one API instance (relevant once deployed), and the challenge's requirement to keep the API stateless-ish for JWT-based RBAC guards fits Nest's guard pipeline more directly.
- **JWT without refresh (long-lived access token)**: simplest to implement, but forces a bad trade-off — either the token is short-lived (Gate staff get logged out mid-shift) or long-lived (a leaked token stays valid for hours). Rejected.
- **Refresh token as a JWT**: avoids a database lookup on refresh, but then revocation (e.g. an organizer's account being disabled) has no effect until the JWT naturally expires. Storing a hashed opaque token makes revocation immediate and rotation straightforward to detect-and-invalidate.

## Consequences

- Every API instance needs access to the same Postgres database to validate refresh tokens (already true — it is the only datastore, ADR 0002).
- The frontend needs one small piece of shared logic (an HTTP client interceptor that retries a request once after a silent refresh), documented once instead of re-implemented per screen.
- A stolen access token is only useful for 15 minutes; a stolen refresh token is unusable outside the browser it was set in (httpOnly cookie) and single-use (rotation).
