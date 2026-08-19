# AI usage

This project was built with Claude Code as the primary implementation tool, under an explicit
brief (from the challenge PDF itself) that generic, unowned "AI slop" is the thing being screened
out — not AI usage itself. This document is honest about where that leaves the process: almost
all code in this repository was AI-written, and the thing that makes it defensible is that every
non-obvious choice has a name, a reason, and a paper trail, not that a human typed the characters.

## What was a human decision, made before any code existed

These were resolved by the person directing the work, as explicit choices among real alternatives,
before implementation started — not defaults the AI picked for them:

- **Ticketmaster Discovery only, at first** — because it returns venue, date, and price in one
  response instead of requiring a second lookup to assemble a sellable event. This held while the
  product was a generic event-ticketing platform. It was **revisited and reversed** once the
  product pivoted to a movie-ticketing app (see the next section): TMDb was added alongside
  Ticketmaster, because a movie catalog needs movie data, which only TMDb provides. The full
  before/after reasoning is in [ADR 0011](adr/0011-external-catalog-integration.md)'s "Update"
  section — nothing was silently swapped, the original call is left intact and the reversal is
  argued on its own terms.
- **Both** seat-map (`SEATED`) and quantity-based (`GENERAL_ADMISSION`) reservation modes, rather
  than picking the easier one — which is also what forced the Strategy-pattern architecture in
  [ADR 0012](adr/0012-allocation-strategy-pattern.md) to exist as more than a style preference.
- **NestJS over Express**, proposed with a reasoned trade-off in
  [ADR 0001](adr/0001-backend-framework.md) and accepted rather than assumed.
- **A real deploy target** (Vercel + Render/Railway + Neon) instead of a local-only demo, which
  is why every config value is environment-variable-driven from the start rather than retrofitted.
- **Neon for local development too**, once it turned out Docker wasn't available in the working
  environment — a pragmatic call, made and owned, not silently substituted.
- Every ADR's "Alternatives considered" section reflects a real choice presented and a real
  answer given, not a rubber stamp on the first option offered.

## What AI implemented under fixed constraints

The bulk of the code — Prisma schema, NestJS modules, React components, tests — was written by
Claude Code, but inside rules that were non-negotiable for the entire build: TDD red-green-refactor
for every feature with real assertions (not tests retrofitted to match already-written code),
zero comments, zero nested/chained conditionals (enforced by `eslint-plugin-sonarjs`, not just
described in prose), a single standardized error contract, and try/catch/finally around every
fallible operation. Those constraints did the work a human code reviewer would otherwise do line
by line — several lint failures during the build (nested ternaries in frontend components, an enum
comparison Prisma's types don't structurally support) were caught by the linter and fixed on the
spot, not waved through.

## Where the process changed based on real evidence, not a prompt

The most consequential bug in this codebase was found by actually using the app, not by
inspecting code. Live browser testing surfaced a real session lockout: a page load's session
bootstrap fired two near-simultaneous refresh-token calls (a legitimate race — React Strict Mode
in development, and the same shape of race in production with two open tabs), and the naive
theft-detection logic read the second, benign call as token theft and revoked the whole session.
The fix — a five-second reuse grace period — and the empirical narrative behind it are written up
in full in [ADR 0004](adr/0004-auth-token-strategy.md), because the reasoning ("this shape of race
is real, here's why five seconds and not thirty") is exactly the kind of judgment call the brief
asks to see made explicit, not hidden inside a diff.

The seat- and ticket-concurrency guarantees — the two hardest requirements in the brief — were not
accepted on the strength of unit tests alone. They were proven against a real Neon database with
genuinely concurrent HTTP requests (general-admission overselling, seated double-booking, gate
double-validation), and the exact-count assertions in those tests are what the "never sell the
same seat twice" claim actually rests on.

## What was deliberately not delegated to AI judgment

Visual design, copy, and the overall product "feel" were treated as decisions with an author, not
generated defaults — the goal stated up front was a page that couldn't be mistaken for a generic
AI output, which is why the original design system (an ink/marquee/velvet, theatre-box-office
palette; the die-cut ticket-stub component; a specific type pairing) existed as a considered
choice rather than a framework default left untouched. That palette was later replaced outright
— see the next section — but the same "someone chose this, on purpose" standard was applied to
its replacement.

## The movie-domain pivot: a second, much larger AI-driven pass

After the initial build above, the product itself was redirected in a follow-up session: from a
generic event-ticketing platform toward a movie-ticketing app in the shape of a template screenshot
the user supplied (dark navy + purple/blue gradient, now-playing/coming-soon browsing, cast, a
showtime picker, reviews, notifications) and explicitly compared to ingresso.com. This was a much
bigger and more autonomous AI pass than the original build, so it gets its own honest accounting
rather than being folded into the section above as if the process hadn't changed.

**What the human decided, in real time, as the session went** (not upfront, because the direction
itself emerged through the conversation): that the movie/actor/review/notification domain should
be layered additively on the existing event/seat/reservation/payment/ticket engine rather than
rewriting it; that reviews should be gated to customers who actually hold a ticket, not open to
anyone; that notifications should be a generic, extensible service rather than a fixed enum of
trigger types; that the product is "like ingresso.com" (the concrete reference that resolved
several ambiguous design calls at once); and, in direct follow-ups after seeing the running app,
that the TMDb catalog was genuinely missing (re-reading this same challenge PDF surfaced that gap
against the "gestão das chamadas para API externa" requirement), that most movies had no showtime
to buy a ticket for, that Black Panther's poster was a placeholder, that cast and "related movies"
were missing from the movie page, and that the deploy should happen once — and only once — the
above was actually verified working, not just believed to be working.

**What was AI-driven with comparatively little turn-by-turn direction**: the Prisma schema shape
for `Movie`/`Actor`/`MovieActor`/`Review`/`Notification`; the entire new design token set (navy
surface scale, purple/blue gradient, font swap) and its application across every screen; the TMDb
client/mapper mirroring the existing Ticketmaster client's shape; and the seed data curation
(which 20 movies, which cast size limit). This is real AI-authored breadth, and it is not TDD in
the strict red-green-refactor sense the original build claims above — tests were written to cover
the new services following the existing test files' patterns, generally alongside or just after
the implementation, not failing-test-first for every line. Where a real automated safety net did
apply throughout was the existing test suite (it had to stay green after every change, and did),
the linter (`eslint-plugin-sonarjs` caught and forced fixes for several nested ternaries and a
`cognitive-complexity` violation introduced by the new screens), and the TypeScript build.

**The one bug that was found by using the app, not by writing or reading code**: every movie
detail page was silently rendering its title and genre chips *invisible* — not missing, not
erroring, genuinely painted-over. This was caught during a live walkthrough of the deployed
change, not a code review, and the same walkthrough is what proved it wasn't a screenshot-timing
fluke: `document.elementFromPoint()` at the title's on-screen coordinates was checked directly and
returned the decorative backdrop-gradient `<div>` instead of the `<h1>`, on every single movie —
including ones that had *looked* fine in earlier screenshots purely by paint-timing luck. The root
cause (a `position: absolute` decorative overlay painting above later, non-positioned sibling
content, per CSS stacking rules, regardless of DOM order) and fix (`relative z-10` on the
overlapping content) are a one-line diff, but the bug was live in production for one push-and-redeploy
cycle before this same live-testing habit — inherited from the original build's approach,
documented above — caught it.

## The subscription pass: a directed choice between two real architectures

A later session added a subscription (2 free tickets/month). Before any code was written, the
person directing the work was asked directly how billing should work — not defaulted into
whichever was easiest to type. The two real options were named explicitly (a no-gateway simulated
subscription record, matching the rest of the checkout's ADR 0015 approach; or real recurring
billing through an actual payment provider's test mode), and the answer was the real gateway,
after being told plainly what that would cost (an external Stripe account, test-mode API keys
supplied by them into `apps/api/.env`, and materially more implementation surface: webhooks, raw
request bodies, a billing cycle). That trade was made with full information, not discovered
partway through.

**What was AI-driven**: the entire implementation once the direction was set — the `Subscription`
Prisma model and its webhook-driven state machine, the Stripe Checkout/Billing Portal integration,
folding free-ticket redemption into the existing `PaymentsService` as a sibling to `pay()` rather
than a parallel checkout path, and [ADR 0017](adr/0017-subscription-billing.md) itself (including
naming and rejecting the "just add a webhook_events table" idempotency option, on the grounds that
every handler here already converges to the same state on a replayed event).

**What surfaced a real, non-obvious bug**: while researching Stripe's current API shape before
writing the webhook handlers, checking the installed SDK's own type definitions (rather than
assuming from prior knowledge) turned up that recent Stripe API versions moved
`current_period_start`/`current_period_end` off the `Subscription` object onto each
`SubscriptionItem`, and moved `invoice.subscription` to `invoice.parent.subscription_details
.subscription`. Code written from memory alone would have compiled, looked plausible, and
silently read `undefined` for the billing period on every renewal — the kind of bug that only
shows up once real webhook traffic arrives. This is also why `apiVersion` was deliberately left
unpinned on the Stripe client (the installed SDK's own default): the code was written and typed
against whatever version actually ships with `stripe@22.5.0`, not a version guessed from general
knowledge that might not match.

**A boot-safety fix made along the way, not asked for but consistent with the rest of the repo**:
the first draft of the Stripe client provider threw at application startup if `STRIPE_SECRET_KEY`
was missing, which would have broken `pnpm dev`/`pnpm build` for anyone who hasn't set up Stripe —
inconsistent with how `TICKETMASTER_API_KEY`/`TMDB_API_KEY` already degrade gracefully elsewhere
in this codebase. It was changed so the app always boots, and each subscription entry point checks
for its own required configuration and fails with a specific, actionable message only when
actually used.
