# Implementation Plan: Order Notifications

**Branch**: `005-order-notifications` | **Date**: 2026-09-26 | **Spec**: `specs/005-order-notifications/spec.md`

**Input**: Feature specification from `/specs/005-order-notifications/spec.md`

## Summary

Persistent per-user order notifications for restaurant admins and platform owners: rows fanned
out inside the existing checkout transaction (atomic with the commit — each persisted order
carries exactly its notification set), read back from the database
on dashboard open (offline-safe), with the unchanged SSE hub delivering a faster copy to live
sessions. Vanilla dashboards gain bell/count/list; zero new dependencies.

## Technical Context

**Language/Version**: Node >= 20, vanilla HTML/CSS/JS, no build step.

**Primary Dependencies**: Existing only (express 4, pg, express-session, helmet, rate-limit,
multer, bcryptjs, qrcode). No additions.

**Storage**: PostgreSQL; new migration `021_notifications.sql` (one table + indexes, additive,
empty-safe). Money/ordering paths untouched.

**Testing**: `node --test tests/` on disposable DB (`TEST_DATABASE_URL` enforced); `npm run check`
gate; suites run one file at a time (shared-DB interference is a known harness trait).

**Target Platform**: Wasmer Edge, single region, single node (SSE + limiters in-process).

**Project Type**: Web application (Express API + served vanilla HTML/JS), existing layout
`server/routes → controllers → services → parameterized SQL`.

**Performance Goals**: Notification fan-out adds two bounded indexed SELECTs + set INSERTs inside
checkout; burst target inherited from 004 (50 concurrent orders, exact notification sets).

**Constraints**: Vanilla JS only; Wasmer-compatible, no new services; backward-compatible
migrations (boot aborts on failure — 019 lesson); prod data never touched by tests; no deploy
without explicit approval.

**Scale/Scope**: 1 new table, 4 endpoints + 1 SSE endpoint, 2 dashboard UI extensions, 1 test
file. CRM, bookings, pricing, subscriptions explicitly out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I Preserve behavior: PASS — order flow gains inserts only; all existing responses unchanged.
- II Small slices: PASS — fan-out → feeds → UI → tests, each revertable.
- III Understand first: PASS — research grounds each touch-point in inspected files.
- IV No blind assumptions: PASS — recipient sets, channel key, and migration safety verified
  against schema/hub/runner before deciding.
- V Isolation: PASS — per-user rows + tenant predicate + separate owner authZ (contract matrix).
- VI–VIII Security/authZ: PASS — row-ownership checks, no client-trusted IDs.
- IX DB safety: PASS — additive migration, new table starts empty, CASCADE chosen deliberately.
- X–XVI Errors/concurrency/perf/quality/compat/tests/observability: PASS — atomic fan-out,
  bounded queries, tests per story, no behavior change to existing paths.
- XVII Deploy safety: PASS — Wasmer-only, no new infra.
- XVIII–XIX No overengineering/vanilla: PASS — zero new deps, SSE hub reused untouched.
- XX–XXII Refactor/verify/docs: PASS — decisions in research.md, gates per slice.

Post-design re-check: no new violations (no abstractions, services, or dependencies added).

## Project Structure

### Documentation (this feature)

```text
specs/005-order-notifications/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── notifications-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
server/
├── routes/        # admin + owner notification endpoints; owner SSE endpoint
├── controllers/   # admin/owner notification handlers (tenantId + requireOwner reuse)
├── services/      # notifications.service (queries) + createCheckout fan-out hook-in
├── middleware/    # sse.js untouched (reserved '__platform__' key only)
database/migrations/  # 021_notifications.sql (new table)
tests/            # notifications.test.js (new)
client/           # admin.js/owner.js bell+list; i18n.js keys (ar/en)
```

**Structure Decision**: In-place extension of the existing layout; no new top-level dirs.

## Implementation Slices (priority order)

### S1 — Fan-out + storage (P1: persistence core)

- Files: `database/migrations/021_notifications.sql` (new), `server/services/notifications.service.js`
  (new), `server/services/orders.service.js:createCheckout` (insert hook-in only).
- Why: Fact — atomicity both ways requires same-transaction inserts (R1).
- Behavior at risk: none intended (same order responses; inserts ride the existing commit).
- Dependencies: none. Tests: offline-inbox + failed-order-silence + burst sets.
- Rollback: git revert (+ table stays harmlessly; append-only history).

### S2 — Feeds + read authZ (P1: isolation)

- Files: `server/routes/admin.routes.js`, `server/routes/owner.routes.js`,
  `server/controllers/admin.controller.js`, `server/controllers/owner.controller.js`,
  `server/validators/index.js` (pagination reuse only).
- Why: Per-user rows + tenant predicate enforce FR-006–008 at the choke points.
- Behavior at risk: none (new endpoints only). Dependencies: S1.
- Tests: isolation matrix (A↔B + owner + direct-ID denial), cross-user read denial,
  persistence across re-login. Rollback: git revert.

### S3 — Real-time copy + UI (P2: online behavior)

- Files: `server/routes/public.routes.js` (broadcast after commit), new owner events endpoint,
  `client/js/admin.js`, `client/js/owner.js`, `client/js/i18n.js` (ar/en keys).
- Why: Persist-first/event-second per the reliability rule; hub reused untouched (R2).
- Behavior at risk: existing toasts unchanged; bell is additive. Dependencies: S1–S2.
- Tests: live-session appearance without refresh + reload shows each notification exactly once
  (no duplicate display). Rollback: git revert.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |
