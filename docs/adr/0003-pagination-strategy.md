# 0003 — Pagination strategy: offset/limit with a standardized envelope

## Context

Every list endpoint (public event catalog, an organizer's own events, a customer's tickets) must be paginated, with the response format standardized across the whole API. The public catalog also needs to support "jump to page 3" navigation and sorting by price or by date, which a reviewer will exercise directly in the UI.

## Decision

Offset/limit pagination, exposed as `?page=&pageSize=` query params (1-indexed, defaults and max size in `PAGINATION_DEFAULTS`, `packages/contracts/src/pagination/pagination.constants.ts`), with every list response shaped as:

```json
{ "data": [...], "meta": { "page": 1, "pageSize": 20, "total": 57, "totalPages": 3 } }
```

`buildPaginationMeta()` in `packages/contracts` is the single function that computes `meta`, shared by every module that lists something, so the envelope cannot drift between endpoints.

This is also why `Event` carries `@@index([status, startsAt])` and a separate `@@index([status, priceCents])`: the two dominant queries — "published events ordered by date" and "published events ordered/filtered by price" — do not share a useful column order, so one composite index would only serve one of them efficiently. `@@index([venueId])` and `@@index([organizerId])` support the venue lookup on the event detail page and the organizer's "my events" list respectively.

## Alternatives considered

- **Cursor-based pagination**: avoids "page drift" when rows are inserted/deleted between page loads, and scales better on very large, high-write tables. This dataset is a curated catalog (an organizer publishing events, not a firehose of writes), and the required UX is explicit page numbers with sort-by-price/date, which cursors do not support well (a cursor is opaque and tied to one sort order). Rejected for this scope; would be revisited if the catalog needed infinite-scroll on a high-churn feed.

## Consequences

- `total`/`totalPages` require a `COUNT(*)` alongside the page query; acceptable at this data scale, and both queries hit the same indexes above.
- A row inserted between two page requests can shift results by one position (the classic offset-pagination drift) — acceptable and disclosed as a known limitation, not a correctness issue for ticket sales.
