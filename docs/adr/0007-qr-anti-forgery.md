# 0007 — QR code anti-forgery

## Context

The gate must be able to tell a genuinely issued ticket from a guessed or hand-crafted code, without a network round trip to some external authority and without leaking information that would help an attacker forge one.

## Decision

Each ticket's QR payload encodes `ticketId` plus an HMAC-SHA256 signature of that id, computed with a secret (`QR_HMAC_SECRET`) that exists only in the API's environment and is never sent to the client in any form. On scan (or manual entry), the gate service recomputes the HMAC over the submitted `ticketId` and compares it, constant-time, to the submitted signature; a mismatch — or a `ticketId` that does not exist — is reported identically as `NOT_FOUND` (ADR 0010's error contract), so an attacker probing for valid ids cannot distinguish "wrong signature" from "no such ticket."

## Alternatives considered

- **A signed JWT as the QR payload**: also achieves unforgeability, but a JWT carries a header and claims that bloat the QR code and expose the token structure/algorithm for no benefit here — the gate only ever needs one fact (which ticket, provably issued by us), which a raw HMAC already proves. Rejected as unnecessary payload weight.
- **A random opaque code stored and looked up in the database (no signature)**: works as long as the code is unguessable, but then "unforgeable" depends entirely on the code's entropy and on never leaking the full code list — there's no cryptographic proof, just secrecy of a lookup key. The HMAC approach proves authenticity independent of database exposure.

## Consequences

- Rotating `QR_HMAC_SECRET` invalidates every previously issued QR code — acceptable, since it is not expected to rotate outside of a security incident, and is documented as an operational note.
- The public share link (ADR 0008) intentionally uses a **different** code (`qrPublicCode`, a high-entropy random id) from the HMAC-signed gate payload, so sharing a ticket link never exposes anything the gate's forgery check relies on.
