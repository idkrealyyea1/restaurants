# Tasks: SaaS Stabilization

**Input**: Design documents from `/specs/004-saas-stabilization/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Requested (Spec FR-016, story Independent Tests). Test tasks come FIRST per story and MUST
FAIL before implementation.

**Organization**: Grouped by user story; plan slices noted per task (S1–S10).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verification before any change.

- [X] T001 Confirm disposable test DB works: `TEST_DATABASE_URL` set, `node --test tests/` green on
  clean tree in tests/helpers.js harness
- [X] T002 Record baseline: `npm run check` 0 failures and quickstart.md smoke results in
  specs/004-saas-stabilization/notes-baseline.md (new file, notes only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared test helpers every story needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Extend tests/helpers.js with role-session factory (owner, admin A/B, staff, visitor) if
  missing; all stories reuse it
- [X] T004 [P] Verify `btree_gist` availability on disposable DB and record existing booking overlaps
  in specs/004-saas-stabilization/notes-booking-probe.md (new file, notes only; decides S2 mechanism)

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel (respecting
story order US1 → US2 → US4).

---

## Phase 3: User Story 1 — Tenant isolation holds (Priority: P1) 🎯 MVP

**Goal**: Cross-tenant access denied for all roles with zero data leaked (plan S1).

**Independent Test**: Probe matrix per contracts/isolation-matrix.md — 100% DENY, zero leaked rows.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.**

- [X] T005 [P] [US1] Extend tests/tenant-isolation.test.js with `?restaurantId=` swap + direct-ID
  probes for admin/staff/visitor
- [X] T006 [P] [US1] Add retired-delivery-credential denial probes in tests/tenant-isolation.test.js
- [X] T007 [P] [US1] Enumeration probes in tests/tracking-enumeration.test.js (new file): guessed
  tracking/offer codes throttled and expose minimal fields only (FR-007)

### Implementation for User Story 1

- [X] T008 [US1] Harden tracking/offer lookups per T007 findings in server/routes/public.routes.js
  (only gaps the probe proves; nothing speculative)
- [X] T009 [US1] Harden tenantId() in server/controllers/admin.controller.js (server-check explicit
  selection; deny staff)
- [X] T010 [US1] Audit server/middleware/auth.js guards for tenant scoping gaps found by T005
- [X] T011 [US1] Run isolation matrix green + full suite in tests/ (no regressions)

**Checkpoint**: US1 fully functional and independently testable.

---

## Phase 4: User Story 2 — Orders correct under submission load (Priority: P1)

**Goal**: 50-burst correctness, no duplicate orders, DB-enforced booking guarantee (plan S2).

**Independent Test (burst)**: 50 simultaneous submissions → each success exactly one cent-correct
order; legitimate rejections create nothing. **Independent Test (duplicate, separate)**: same
submission twice → single persisted order.

### Tests for User Story 2

- [X] T012 [P] [US2] Burst test in tests/order-submission-burst.test.js (new file): 50 simultaneous
  submissions, success/rejection accounting, no partials
- [X] T013 [P] [US2] Double-submit replay test in tests/order-double-submit.test.js (new file): same
  intent twice → one order
- [X] T014 [P] [US2] Booking race test in tests/booking-race.test.js (new file): N conflicting → 1
  success + N−1 clean 409s; non-conflicting all succeed
- [X] T015 [P] [US2] Lifecycle matrix test in tests/lifecycle-matrix.test.js (new file): every
  transition pair in contracts/lifecycle.md exercised across admin and customer paths; all invalid
  pairs rejected with a clear message
- [X] T016 [P] [US2] Grace-atomicity test in tests/cancel-grace.test.js (new file): cancel submitted
  at the grace-window edge (including twice/concurrently) → deterministic single outcome, no partial
  state

### Implementation for User Story 2

- [X] T017 [US2] Resolve booking window duration source (fixed house window vs new field) per R3;
  record ceiling with `ponytail:` comment in server/services/bookings.service.js
- [X] T018 [US2] Implement booking guarantee in server/services/bookings.service.js (exclusion
  constraint if T004 proved `btree_gist`, else parent-row `FOR UPDATE` serialization) plus
  database/migrations/019_*.sql (new file) only if schema change chosen
- [X] T019 [US2] Implement smallest double-submit fix in server/services/orders.service.js
  (`createCheckout`), server/routes/public.routes.js, client/js/restaurant.js per R8 (no framework)
- [X] T020 [US2] Enforce grace atomically in `cancelByCustomer` in server/services/orders.service.js
  (re-check time in the UPDATE, same write that checks status)
- [X] T021 [US2] Run T012–T016 green + full suite in tests/ (no regressions)

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 — Untrusted input rejected (Priority: P2)

**Goal**: Server-side validation at all trust boundaries (plan S8-validation).

**Independent Test**: Hostile-input battery → rejection + safe messages + clean DB.

### Tests for User Story 3

- [X] T022 [P] [US3] Hostile-input battery in tests/input-validation.test.js (new file): forged
  totals, bad quantities/types, oversized payloads, bad uploads, unknown sensitive fields

### Implementation for User Story 3

- [X] T023 [US3] Move `trialDays`/`subscriptionEndsAt` bounds into server/validators/index.js from
  server/controllers/owner.controller.js
- [X] T024 [US3] Add `itemId` UUID assertion at upload path in server/controllers/admin.controller.js
- [X] T025 [US3] Add transition assert to unexported `updateStatus` in server/services/orders.service.js
  (one line, R6)
- [X] T026 [US3] Run T022 green + full suite in tests/ (no regressions)

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 — Roles and subscriptions gate correctly (Priority: P2)

**Goal**: Staff create-only, delivery accounts retired, delivery toggle live (plan S3+S4+S5).

**Independent Test**: Remit matrix (staff create ALLOW / all else DENY); retired credentials denied;
toggle OFF → delivery submission rejected, pickup works; expired subscription refuses orders while
dashboards stay readable, reactivation restores ordering.

### Tests for User Story 4

- [X] T027 [P] [US4] Staff-remit matrix test in tests/staff-remit.test.js (new file)
- [X] T028 [P] [US4] Delivery-toggle tests in tests/orders.test.js (extend): OFF rejects / ON accepts
- [X] T029 [P] [US4] Subscription-gate test in tests/subscription-gate.test.js (new file): expired
  subscription refuses new orders/bookings, preserves read access, reactivation restores ordering
  without data repair (delivery-toggle tests co-located in same file)

### Implementation for User Story 4

- [X] T030 [US4] Swap `requireOwnerOrStaff` → `requireOwner` except `POST /restaurants` in
  server/routes/owner.routes.js; verify staff-created restaurants bootstrap admin login
- [X] T031 [US4] Retire delivery provisioning: server/routes/owner.routes.js account CRUD,
  server/routes/delivery.routes.js, `requireDelivery` in server/middleware/auth.js,
  client/delivery.html + client/js/delivery.js (keep tables until T032 decision)
- [X] T032 [US4] Add `delivery_enabled` (DEFAULT true) via database/migrations/020_*.sql (new file);
  enforce in `createCheckout` (server/services/orders.service.js) + settings service/validators;
  expose toggle in client/js/admin.js; hide option in client/js/restaurant.js
- [X] T033 [US4] Fix subscription-gate gaps proven by T029 only (nothing speculative)
- [X] T034 [US4] Run T027–T029 green + full suite in tests/ (no regressions)

**Checkpoint**: US1–US4 independently functional.

---

## Phase 7: User Story 5 — Vanilla served, React legacy retired (Priority: P2)

**Goal**: Vanilla `client/` served; React removed on zero-reference proof (plan S6).

**Independent Test**: Smoke suite green before AND after deletion; strings consistent ($19.99).

### Tests for User Story 5

- [X] T035 [P] [US5] Reference-grep gate script in scripts/check-no-react-refs.sh (new file):
  zero hits for `frontend/dist` across server/, config/, app.yaml, tests/, scripts/, docs/

### Implementation for User Story 5

- [X] T036 [US5] Verify live Wasmer deployment state first (outside repo; record outcome in
  specs/004-saas-stabilization/notes-live-verify.md — new file, notes only)
- [X] T037 [US5] Re-point `CLIENT_DIR` to `client/` in server/app.js; audit explicit SPA routes;
  run full quickstart.md smoke
- [X] T038 [US5] Reconcile user-facing strings to 1999 canonical (server/services/bookings.service.js
  message, vanilla/client strings); re-run smoke
- [X] T039 [US5] Classify root-level files (used / doc-reference / useful asset / confirmed obsolete),
  report list, delete ONLY confirmed-obsolete; delete `frontend/` only after T035 passes (T039 is
  blocked on T035)

**Checkpoint**: US1–US5 independently functional.

---

## Phase 8: User Story 6 — Failures diagnosable, messages safe (Priority: P3)

**Goal**: Correlated secret-free logs; safe client messages (plan S8-errors + S9).

**Independent Test**: Trigger representative failures → correlated log + safe response, no leakage.

### Tests for User Story 6

- [X] T040 [P] [US6] Failure-leak test in tests/error-safety.test.js (new file): 4xx/5xx responses
  contain no secrets, tokens, or stacks

### Implementation for User Story 6

- [X] T041 [US6] Audit error envelope in server/utils/errors.js for internals leakage (fix only what
  T040 proves)
- [X] T042 [US6] Add failure correlation to order/booking paths in server/services/orders.service.js
  and server/services/bookings.service.js (log context, no new infra)

**Checkpoint**: US1–US6 independently functional.

---

## Phase 9: User Story 7 — Fast under load (Priority: P3)

**Goal**: Hot paths meet 10× targets; N+1 eliminated; ceilings documented (plan S7).

**Independent Test**: Load run per quickstart.md §5 — 95% < 2s, zero lost orders.

### Tests for User Story 7

- [X] T043 [P] [US7] Load probe script in scripts/load-probe.sh (new file): 50-burst + 10/min
  sustained against disposable env, reporting p95 + order accounting

### Implementation for User Story 7

- [X] T044 [US7] Profile menu/order/analytics/report queries in server/services/menu.service.js,
  server/services/orders.service.js, server/services/restaurants.service.js; fix N+1/unbounded
  queries found (paginate/bound only)
- [X] T045 [US7] Document single-node ceilings with `ponytail:` comments in
  server/middleware/ratelimit.js and server/middleware/sse.js (docs, no re-architecture)

**Checkpoint**: All user stories independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Deploy verification and final validation (plan S10).

- [X] T046 Run deploy-verification runbook (migrate → seed → `/api/healthz` → smoke) on
  staging-equivalent env per specs/004-saas-stabilization/quickstart.md; no prod touch without
  approval
- [X] T047 [P] Full validation: `npm run check`, `node --test tests/`, quickstart.md end-to-end;
  record results
- [X] T048 [P] Re-validate specs/004-saas-stabilization/checklists/requirements.md and
  specs/004-saas-stabilization/checklists/production-readiness.md against delivered work

---

## Phase 11: Convergence

**Purpose**: Close remaining spec/plan gaps found by `/speckit.converge` (2026-09-26). Run these
with `/speckit.implement`, then re-converge.

- [X] T049 Enforce the cancel grace window inside the UPDATE in `cancelByCustomer` in
  server/services/orders.service.js (add `AND created_at > now() - ($2 || ' milliseconds')::interval`
  with graceMs as $2) per FR-010 (partial)
- [X] T050 Refetch orders/bookings/dashboard views on SSE reconnect in `connectEvents` in
  client/js/admin.js (add `eventSource.onopen` refresh; server sends no replay) per FR-013 (partial)
- [X] T051 Evidence the sustained rate in scripts/load-probe.sh (add a 10-submissions/min sustained
  run reporting success rate alongside the burst) per SC-006 (partial)
- [X] T052 Reconcile stale spec wording in specs/004-saas-stabilization/spec.md Confirmed Facts
  ("dead weight", "source of truth TBD") with Decisions D1/D5 per Spec Decisions (partial)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all stories (T004 decides S2 mechanism).
- **User Stories (Phases 3–9)**: Depend on Foundational; required order US1 → US2 → US4 (isolation
  before concurrency before authZ changes); US3/US6/US7 may parallelize after US2.
- **Polish (Phase 10)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies. 🎯 MVP.
- **US2 (P1)**: After US1 — concurrency proofs assume isolation holds.
- **US3 (P2)**: After Foundational — parallelizable with US1/US2.
- **US4 (P2)**: After US1 — guard changes assume probe matrix exists.
- **US5 (P2)**: After US4 — deletion safest after authZ surface settled.
- **US6 (P3)**: After US2 — needs known failure modes.
- **US7 (P3)**: After US5 — profile served paths.

### Parallel Opportunities

- T003 + T004 (different files); T005 + T006 + T007; T012 + T013 + T014 + T015 + T016; T022;
  T027 + T028 + T029; T035; T040; T043; T047 + T048. Stories US3/US6/US7 can parallelize once
  US1/US2 land.

---

## Parallel Example: User Story 2

```bash
# Launch all US2 tests together (must FAIL before T017–T020):
Task: "Burst test in tests/order-submission-burst.test.js"
Task: "Double-submit replay test in tests/order-double-submit.test.js"
Task: "Booking race test in tests/booking-race.test.js"
Task: "Lifecycle matrix test in tests/lifecycle-matrix.test.js"
Task: "Grace-atomicity test in tests/cancel-grace.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: US1 (T005–T011)
4. **STOP and VALIDATE**: isolation matrix green independently.

### Incremental Delivery

Setup + Foundational → US1 (MVP) → US2 → US4 → US3/US5 → US6/US7 → Polish. Each phase
independently testable; rollback per slice is `git revert` (migrations append-only).

---

## Notes

- [P] tasks = different files, no dependencies
- Every task carries an ID, story label (story phases), and exact file path
- Data-model constraints quoted verbatim where they bind implementation: `tables_count BETWEEN 1
  AND 20`, `price_cents` server-sourced, `bookedAt` not past-60s, `delivery_enabled DEFAULT true`
- No new dependencies, frameworks, or services in any task
