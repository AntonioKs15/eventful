# 0001 — Backend framework: NestJS

## Context

The challenge requires a Node.js backend with three distinct roles (Organizer, Customer, Gate), a single standardized error contract enforced centrally, structured JSON logging with request correlation, and a layered architecture. It also imposes hard code rules: no nested/chained ifs, dependency wiring that supports a Strategy pattern for seat vs. general-admission allocation, and try/catch/finally around every fallible operation.

## Decision

Use **NestJS** as the backend framework.

- `Guards` give role-based access control (RBAC) for the three roles as a declarative, testable unit, instead of hand-rolled middleware checks scattered across route handlers.
- Built-in dependency injection lets the allocation Strategy (ADR 0012) and the catalog provider adapter be swapped by binding, not by conditional branching.
- A global `ExceptionFilter` plus `Interceptor` pipeline gives one place to enforce the error contract (ADR 0010) and structured logging (ADR 0009), rather than repeating try/catch boilerplate that maps errors ad hoc in every controller.
- `@nestjs/swagger` generates the OpenAPI documentation the challenge's "diferenciais" section rewards, directly from the same decorators used for validation.

## Alternatives considered

- **Express**: minimal and unopinionated, but every one of the points above (RBAC guard pipeline, DI, global exception handling, OpenAPI generation) would have to be assembled manually from separate libraries with no enforced convention. For a scope this size, that is bespoke plumbing with no corresponding benefit — Express's flexibility is not needed here, since the domain does not call for a non-standard request pipeline.
- **Fastify** (standalone): faster raw throughput, but the same "assemble everything yourself" gap applies, and raw throughput is not a constraint for this challenge.

## Consequences

- Slightly more boilerplate per module (module/controller/service triplet) than a minimal Express route file.
- The team (here, a single developer) must follow Nest's DI and decorator conventions consistently; deviating from them (e.g. reaching into `req` directly instead of using guards/pipes) would silently reintroduce the problems this decision avoids.
- NestJS's testing module (`@nestjs/testing`) integrates directly with Jest, which is what makes the TDD workflow for this project practical without extra test-harness code.
