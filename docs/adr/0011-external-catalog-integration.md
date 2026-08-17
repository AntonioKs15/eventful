# 0011 — External catalog integration: Ticketmaster Discovery via backend proxy

## Context

The organizer builds an event starting from a catalog of live shows. The challenge names Ticketmaster Discovery and TMDb as options; TMDb's catalog is movies with no real showtime/venue/price data, which would force inventing that data anyway, while Ticketmaster Discovery already returns a venue, a date, and a price range per event — a much closer fit for a ticketing platform's actual domain. The Ticketmaster API key must never be exposed to a browser, and its free tier is rate-limited (5 requests/second, 5000/day).

## Decision

Ticketmaster Discovery only. All calls go through `CatalogService` → `TicketmasterClient` in `apps/api/src/catalog`, never from the frontend directly. Responses are cached in the `ExternalCatalogCache` table, keyed by `(provider, queryKey)` with a TTL, so repeated identical searches (e.g. the same city/keyword typed by different organizers) do not each burn a rate-limited call. A local venue can also be created manually by an organizer without going through the catalog at all — so the platform's seed data and demo flow never depend on Ticketmaster's data being available or fresh at evaluation time.

## Alternatives considered

- **TMDb, in addition or instead**: rejected for this scope — doubling the external integrations (and their test surface) does not add a differentiator proportional to the effort, per the challenge's own advice to finish one simple flow completely rather than several partially.
- **Frontend calling Ticketmaster directly**: would require shipping the API key to the browser, and removes the backend's ability to cache/rate-limit — rejected outright, this is also what the challenge's "gestão das chamadas para API externa" requirement is pointing at.

## Consequences

- If the Ticketmaster API key is unset or the service is unreachable, event creation falls back gracefully to the manual-venue path rather than failing outright — the catalog is inspiration, not a hard dependency, and this is called out explicitly in the README.
- Cache entries are purged lazily by their `expiresAt` index (ADR 0002/schema) rather than a separate cron, keeping this integration to one extra table instead of one extra service.
- `GET /catalog/search` is restricted to the `ORGANIZER` role (not just any authenticated user) — browsing the raw Ticketmaster catalog is a step in building an event, not something a customer or gate user has a reason to do, and narrowing it keeps rate-limit consumption tied to the one flow that needs it.
- Importing a catalog result creates (or reuses, via `Venue`'s `(source, externalId)` unique constraint) a `Venue` row eagerly at event-creation time, not at search time — a search result is inspiration only, and doing the actual Ticketmaster venue id resolution as part of `POST /events` means a venue is only ever persisted for events that actually get created, not for every result a browsing organizer happened to see.
