# Implementation Plan: SaaS Stabilization

**Branch**: `004-saas-stabilization` | **Date**: 2026-09-25 | **Spec**: `specs/004-saas-stabilization/spec.md`

**Input**: User description — "Create a modernization plan based on the actual repository..." plus
spec 004 (7 stories, 20 FRs, decisions D1–D4 + clarify answers) and research in `research.md`.

## Summary

Harden the existing Express + Postgres + vanilla-JS SaaS in 10 ordered, independently revertable
slices: tenant isolation proofs, concurrency correctness, delivery-account retirement, staff
minimum-privilege, vanilla re-serving, then validation/observability/perf/dead-code. No rewrite
(evidence in R7), no new dependencies, no framework change. Each slice states affected files, why,
behavior at risk, dependencies, tests, and rollback, and separates repo Facts from Recommendations.

## Technical Context

**Language/Version**: Node >= 20 (`engines` in package.json), vanilla HTML/CSS/JS, no build step.

**Primary Dependencies**: express 4, pg, express-session + connect-pg-simple, helmet,
express-rate-limit, multer, bcryptjs, qrcode. No additions planned.

**Storage**: PostgreSQL (DATABASE_URL or Wasmer DB_*; TLS rejectUnauthorized:false); idempotent
migrations 001–018 via migrate.js + schema_migrations; money in cents.

**Testing**: `node --test tests/` (6 suites) on disposable DB (`TEST_DATABASE_URL` enforced);
`npm run check` syntax gate; manual smoke list in quickstart.md.

**Target Platform**: Wasmer Edge, single region fr-roub1, single node (rate limits + SSE in-process).

**Project Type**: Web application (Express API + served HTML/JS) with platform/restaurant/diner roles.

**Performance Goals**: 10× dev traffic — 50-submission bursts, 10 order submissions/min sustained, 95% hot
paths < 2s, zero lost/duplicated orders (SC-002/SC-006).

**Constraints**: Vanilla JS only; Wasmer-compatible, no new services; backward-compatible migrations;
prod data never touched by tests; no deploy without explicit approval.

**Scale/Scope**: 10 slices, ~20 FRs; CRM (leads/offers) deferred; live-deployment state unverified
(S6 must verify first).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I Preserve behavior: PASS — every slice preserves behavior except explicitly decided changes
  (D1 vanilla canonical, D4 delivery retirement, staff create-only); each slice lists behavior at risk.
- II Small slices: PASS — 10 ordered slices, each reviewable + revertable via git revert.
- III Understand first: PASS — research.md grounds each slice in inspected files/lines.
- IV No blind assumptions: PASS — live-deploy state and booking-duration source recorded as explicit
  verify-first items, not invented.
- V Isolation: PASS — S1/S4 enforce `req.user.restaurant_id` scoping; matrix in
  contracts/isolation-matrix.md.
- VI–VIII Security/authZ: PASS — S3/S4 remove over-permission; login/session mechanics untouched.
- IX DB safety: PASS — append-only compatible migrations; history-vs-drop decided late (S3).
- X–XVI Errors/concurrency/perf/quality/compat/tests/observability: PASS — S2/S7/S8/S9 target these.
- XVII Deploy safety: PASS — Wasmer-only, no new infra; S10 verifies.
- XVIII–XIX No overengineering/vanilla: PASS — zero new deps; React removed, not added.
- XX–XXII Refactor/verify/docs: PASS — root-cause fixes, gates per slice, decisions recorded.

Post-design re-check: no new violations introduced (no new abstractions, single-use helpers, or
dependencies added by any slice).

## Project Structure

### Documentation (this feature)

```text
specs/004-saas-stabilization/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── isolation-matrix.md
│   └── lifecycle.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
server/
├── routes/        # guard changes (S3, S4), delivery route retirement (S3)
├── controllers/   # tenantId() (S1, S4), createRestaurant bounds (S8)
├── services/      # order-submission/booking guards (S2, S5, S9), delivery toggle (S5)
├── middleware/    # auth guards, ratelimit docs (S1, S4, S7)
├── validators/    # moved inline checks (S8)
└── app.js         # CLIENT_DIR re-point (S6)
client/           # canonical frontend: preserved, string fixes (S6)
frontend/         # legacy: removed after zero-reference proof (S6)
database/migrations/  # append-only: delivery toggle (S5), late delivery-table call (S3)
tests/            # probe matrix, burst/race tests, remit matrix (S1, S2, S4, S5)
config/index.js   # unchanged (values reused: grace 15m, limits)
```

**Structure Decision**: In-place incremental work in existing layout; no new top-level dirs. New tests
extend `tests/`; no new framework.

## Implementation Slices (priority order)

### S1 — Tenant-isolation probe + `?restaurantId=` hardening (P1: vuln/isolation)

- Files: `server/controllers/admin.controller.js:25-34`, `server/middleware/auth.js`,
  `tests/tenant-isolation.test.js` (extend).
- Why: Fact — owner/staff `?restaurantId=` accepted with no membership check; any over-wide read
  leaks a whole restaurant. Recommendation — server-check every explicit selection; deny staff
  outright (with S4).
- Behavior at risk: owner multi-restaurant workflows (must keep working via explicit selection).
- Dependencies: none. Tests: probe matrix per contracts/isolation-matrix.md, 100% DENY zero-leak.
- Rollback: git revert; no migration.

### S2 — Order-submission correctness: concurrent burst + duplicate-submit + DB-enforced booking guarantee (P1: integrity)

- Files: `server/services/orders.service.js` (pin behavior; duplicate-submit fix),
  `server/routes/public.routes.js:39-53` (order-creation endpoint), `client/js/restaurant.js:366-386`
  (`submitOrder`), `server/services/bookings.service.js` (guarantee per R3),
  `database/migrations/019_*.sql` (only if constraint/end-column chosen),
  `tests/` (new burst + double-submit + race files).
- Why: Fact — order creation already `FOR UPDATE`-guarded (verify pins it); bookings insert with no
  guard outside any transaction (both succeed). An app-level overlap query in a plain transaction is
  explicitly insufficient: under read committed, two conflicting transactions can both pass the
  check and both commit. The mechanism MUST make dual commit impossible — exclusion constraint
  (after `btree_gist` probe + backfill check) or parent-row `FOR UPDATE` serialization (R3).
  Fact (F-DUP) — `createCheckout` has no idempotency: the only double-submit guard is the client
  disabling the button in flight, so a double-flight, retry-after-commit, or slow-network
  double-click persists two orders. Recommendation — smallest safe fix compatible with the existing
  flow (e.g. client-generated submission key returned to the existing order on repeat; tasks choose
  the minimum — no idempotency framework, no redesign). Note: there is no payment flow; "order
  submission" means creating a fulfillment order, not paying.
- Behavior at risk: double-booking and double-order rejection are new (user-approved D); verified
  order-creation behavior otherwise unchanged.
- Dependencies: S1 (isolation first). Tests (burst and duplicate kept separate): 50-submission
  burst (successes → exactly one order each; legitimate rejections → nothing, no partials); double-submit replay → single persisted
  order; overlap race → exactly 1 success + N−1 clean 409s with non-conflicting all succeeding;
  cancel-at-deadline deterministic.
- Rollback: revert code; constraint removal (if added) via follow-up migration — never break
  append-only history.

### S3 — Delivery-account retirement (P1: authZ surface removal)

- Files: `server/routes/owner.routes.js:50-53`, `server/routes/delivery.routes.js`,
  `server/services/delivery.service.js`, `server/middleware/auth.js` (`requireDelivery`),
  `client/delivery.html` + `client/js/delivery.js`, migration decision for `delivery_groups`,
  `restaurant_delivery_groups`, `users.delivery_group_id`.
- Why: Fact — user decision D4: delivery accounts exist without purpose; every delivery endpoint is
  dead surface. Recommendation — ordered: block provisioning → remove routes/guards/UI → resolve
  tables (history vs drop) last.
- Behavior at risk: any live delivery logins stop working (intended, user-approved); restaurant order
  flow untouched until S5.
- Dependencies: S1. Tests: retired credentials denied everywhere; no route references remain (grep
  gate). Rollback: revert in reverse order; tables kept until final step so data survives.

### S4 — Staff create-only (P1: least privilege)

- Files: `server/routes/owner.routes.js:12-53` (owner-guard 14 routes, keep staff on POST
  /restaurants), `server/controllers/admin.controller.js:tenantId()` (deny staff), staff-remit
  tests (extend `auth.test.js` or new).
- Why: Fact — staff currently rides `requireOwnerOrStaff` on ~15 routes (R1). Recommendation —
  guard swap per R1; verify staff-created restaurants still bootstrap admin login (R1 open item).
- Behavior at risk: staff workflows beyond restaurant creation stop (intended, user-approved).
- Dependencies: S1. Tests: remit matrix (create ALLOW, all else DENY). Rollback: git revert.

### S5 — Per-restaurant delivery toggle (P2: data integrity)

- Files: `database/migrations/019_*.sql` (new, `delivery_enabled bool DEFAULT true`),
  `server/services/orders.service.js:createCheckout` (reject delivery when OFF),
  `server/services/settings.service.js` + validators, `client/js/admin.js` settings tab,
  `client/js/restaurant.js` (hide delivery option), `tests/orders.test.js` (extend).
- Why: Fact — order creation prices delivery fee from settings with no availability gate (D4 requires the
  toggle). Recommendation — DEFAULT true preserves current behavior; enforcement server-side.
- Behavior at risk: delivery-disabled restaurants reject delivery order submissions (intended); pickup
  unaffected. Dependencies: S3. Tests: toggle OFF→reject/ON→accept; UI hides option. Rollback:
  revert code; migration is additive (column default true = old behavior).

### S6 — Vanilla re-serving + React legacy removal (P2: arch consistency)

- Files: `server/app.js:29,125-185` (CLIENT_DIR → client/, route audit), live Wasmer verification
  (outside repo), `frontend/` deletion, string reconciliation (bookings.service.js:29 `$8.99`,
  vanilla/owner strings → 1999 canonical).
- Why: Fact — repo serves abandoned bundle; vanilla unserved (verified by grep). Recommendation —
  verify-live → re-point → full smoke → delete on zero references (server/config/deploy/tests/
  scripts/docs). Vanilla never edited to match React.
- Behavior at risk: serving path swap (highest-risk slice; staged + smoked). Dependencies: S3–S5
  done first so removed tree can't hide live behavior. Tests: quickstart smoke ×2 (before/after
  delete) + reference grep gate. Rollback: revert re-point commit; deletion revert restores files.

### S7 — Hot-path query discipline + single-node ceilings (P3: performance)

- Files: menu/order/analytics/report queries (`menu.service`, `orders.service` analytics/export,
  `restaurants.service` directory), docs for rate-limit/SSE single-node ceilings (`ponytail:`
  comments + FR-019 note).
- Why: Recommendation — paginate/bound where missing, kill N+1 found by profiling at 10× load;
  document ceilings instead of re-architecting (XVIII).
- Behavior at risk: none intended (same results, bounded). Dependencies: S6 (profile served paths).
  Tests: load run per quickstart §5. Rollback: git revert.

### S8 — Validation + error-handling pass (P2/P3: robustness)

- Files: `server/validators/index.js` (absorb `trialDays`/`subscriptionEndsAt` bounds from
  `owner.controller.js:75-81`; `itemId` assertUuid at `admin.controller.js:uploadImage`),
  `server/utils/errors.js` (leak audit), one-line assert in unexported `updateStatus` (R6).
- Why: Fact — two inline parses + one unvalidated query param found by inspection; error envelope
  already hides internals (verify, don't rebuild).
- Behavior at risk: tighter rejections on malformed input (intended). Dependencies: none. Tests:
  hostile-input battery (extends misc/orders tests). Rollback: git revert.

### S9 — Observability minimum (P3: reliability)

- Files: logging call sites (`utils/errors.js`, `db/pool.js`, `middleware/sse.js` reconnect notes).
- Why: Recommendation — correlation on order-submission/booking failures, secret-free audit (no new infra).
- Behavior at risk: log volume only. Dependencies: S2 (know failure modes). Tests: trigger failures,
  assert correlated logs + safe responses. Rollback: git revert.

### S10 — Deploy-verification runbook (P3: safety)

- Files: docs only (`DEPLOYMENT.md` deltas if any) + staging-equivalent verify run.
- Why: Constitution XXI — migrate → seed → healthz → smoke before any prod claim.
- Behavior at risk: none (no prod touch without approval). Dependencies: all slices. Tests: runbook
  execution. Rollback: n/a (verification only).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |
