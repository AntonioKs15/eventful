# 0004 — Authentication and token strategy

## Context

The challenge requires three distinct roles and is explicit that credentials and tokens are managed entirely by the API — the frontend must only consume a session, never mint or validate a token itself. The Gate role is used for a long, continuous shift at a single door, so the session should not force a re-login every few minutes; the Customer/Organizer roles are used interactively in short bursts.

## Decision

- Password hashing with `argon2` (current OWASP-recommended default over bcrypt).
- Short-lived JWT **access token** (15 minutes), returned in the response body and held by the frontend only in memory (never `localStorage`/`sessionStorage`), carrying `sub` (user id) and `role`.
- Longer-lived **refresh token**, opaque and random (not a JWT), stored **hashed** in the `RefreshToken` table, delivered to the browser as an `httpOnly`, `Secure`, `SameSite=Strict` cookie — inaccessible to frontend JavaScript by construction.
- Refresh is **rotating**: each use of a refresh token issues a new access + refresh pair and revokes the old refresh token row (`revokedAt`). Reusing an already-rotated refresh token is treated as a signal of theft and revokes the entire token family.
- All of the above — issuance, verification, expiry, rotation — lives in `apps/api/src/auth`. The frontend never decodes or inspects the JWT; it only reacts to 401 responses by calling the refresh endpoint.

## Alternatives considered

- **Server-side sessions (cookie + session store)**: simpler mental model, but requires a shared session store the moment there is more than one API instance (relevant once deployed), and the challenge's requirement to keep the API stateless-ish for JWT-based RBAC guards fits Nest's guard pipeline more directly.
- **JWT without refresh (long-lived access token)**: simplest to implement, but forces a bad trade-off — either the token is short-lived (Gate staff get logged out mid-shift) or long-lived (a leaked token stays valid for hours). Rejected.
- **Refresh token as a JWT**: avoids a database lookup on refresh, but then revocation (e.g. an organizer's account being disabled) has no effect until the JWT naturally expires. Storing a hashed opaque token makes revocation immediate and rotation straightforward to detect-and-invalidate.

## Consequences

- Every API instance needs access to the same Postgres database to validate refresh tokens (already true — it is the only datastore, ADR 0002).
- The frontend needs one small piece of shared logic (an HTTP client interceptor that retries a request once after a silent refresh), documented once instead of re-implemented per screen.
- A stolen access token is only useful for 15 minutes; a stolen refresh token is unusable outside the browser it was set in (httpOnly cookie) and single-use (rotation).
