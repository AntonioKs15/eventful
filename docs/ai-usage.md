# AI usage

This project was built with Claude Code as the primary implementation tool, under an explicit
brief (from the challenge PDF itself) that generic, unowned "AI slop" is the thing being screened
out — not AI usage itself. This document is honest about where that leaves the process: almost
all code in this repository was AI-written, and the thing that makes it defensible is that every
non-obvious choice has a name, a reason, and a paper trail, not that a human typed the characters.

## What was a human decision, made before any code existed

These were resolved by the person directing the work, as explicit choices among real alternatives,
before implementation started — not defaults the AI picked for them:

- **Ticketmaster Discovery over TMDb** as the external catalog source, because it returns venue,
  date, and price in one response instead of requiring a second lookup to assemble a sellable
  event.
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
AI output, which is why the design system (ink/marquee/velvet palette, the die-cut ticket-stub
component, the specific type pairing) exists as a considered choice rather than a framework
default left untouched.
