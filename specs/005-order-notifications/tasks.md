# Tasks: Order Notifications

**Input**: Design documents from `/specs/005-order-notifications/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Requested (spec Independent Tests per story; FR-016 of 004). Test tasks come FIRST per
story and MUST FAIL before implementation.

**Organization**: Grouped by user story; plan slices noted per task (S1–S3).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verification before any change.

- [ ] T001 Confirm disposable test DB works: `TEST_DATABASE_URL` set, one existing suite green in
  isolation in tests/helpers.js harness
- [ ] T002 Record `npm run check` 0 failures on clean tree

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage and service shell every story needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Create database/migrations/021_notifications.sql (new file): `notifications` table per
  data-model.md (`id`, `recipient_user_id → users CASCADE`, `restaurant_id NULL → restaurants
  CASCADE`, `order_id → orders CASCADE`, `type='new_order'` CHECK, `title`, `body`,
  `is_read DEFAULT FALSE`, `created_at`) + indexes (`recipient_user_id, created_at DESC`;
  partial unread; `order_id`)
- [ ] T004 Create server/services/notifications.service.js (new file): recipient queries (active
  admins by `restaurant_id`; active owners), list/unread-count for a user, mark-read by
  `(id, recipient_user_id)` returning 404 on mismatch

**Checkpoint**: Foundation ready — migration applies on empty and populated DBs; service shell
imports cleanly.

---

## Phase 3: User Story 1 — Restaurant admin never misses an order (Priority: P1) 🎯 MVP

**Goal**: Persisted per-admin notifications, offline-readable, live push as faster copy (plan S1+S3).

**Independent Test**: Order with no session → dashboard shows unread; order with live session →
appears without refresh; reload shows exactly once.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.**

- [ ] T005 [P] [US1] Offline-inbox test in tests/notifications.test.js (new file): order with no
  session → login → unread notification present with order code
- [ ] T006 [P] [US1] Online-appearance test in tests/notifications.test.js: live dashboard session
  sees notification without refresh; reload shows it exactly once

### Implementation for User Story 1

- [ ] T007 [US1] Fan-out inside `createCheckout` in server/services/orders.service.js: insert one
  row per active admin of the restaurant (+ active owners per R1) in the same transaction (T003
  migration must be applied first)
- [ ] T008 [US1] Broadcast `notification:new` after commit in server/routes/public.routes.js
  (restaurant channel, alongside existing `order:new`; payload is a hint only)
- [ ] T009 [US1] Restaurant feed endpoints in server/routes/admin.routes.js +
  server/controllers/admin.controller.js: `GET /api/admin/notifications` (own rows, own tenant,
  paginated) per contracts/notifications-api.md
- [ ] T010 [US1] Bell + unread count + list in client/js/admin.js reusing toast/api/esc; click
  navigates to the existing order view; bilingual keys in client/js/i18n.js (ar/en)
- [ ] T011 [US1] Run T005–T006 green + full suite in tests/ (no regressions)

**Checkpoint**: US1 fully functional and independently testable.

---

## Phase 4: User Story 2 — Platform admin sees every restaurant's orders (Priority: P1)

**Goal**: Owner feed with restaurant context over all restaurants (plan S1+S2).

**Independent Test**: Orders at A and B → A session sees only A, owner sees both with context;
direct cross-tenant access denied.

### Tests for User Story 2

- [ ] T012 [P] [US2] Platform-feed isolation test in tests/notifications.test.js (extend): A/B
  sessions see only own rows; owner sees both with `restaurantSlug`; B-admin direct-ID read of
  A's row → 404 with no leak

### Implementation for User Story 2

- [ ] T013 [US2] Platform endpoints in server/routes/owner.routes.js +
  server/controllers/owner.controller.js: `GET /api/owner/notifications` (role `owner`, no
  tenant scope) + `GET /api/owner/events` subscribed to the `__platform__` SSE key per R2
- [ ] T014 [US2] Owner bell + list in client/js/owner.js (same patterns as T010)
- [ ] T015 [US2] Run T012 green + full suite in tests/ (no regressions)

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 — Read state is personal and authorized (Priority: P2)

**Goal**: Per-recipient read state, surviving re-login, immune to cross-user writes (plan S2).

**Independent Test**: Two admins, overlapping notifications; reads in one leave the other
untouched; state persists across logout/login; foreign mark-read denied.

### Tests for User Story 3

- [ ] T016 [P] [US3] Read-state test in tests/notifications.test.js (extend): mark read → count
  drops for that user only; persists after re-login; other user's row untouched; cross-user and
  cross-tenant mark-read → 404, nothing changed

### Implementation for User Story 3

- [ ] T017 [US3] Read endpoints: `PATCH /api/admin/notifications/:id/read` (row ownership +
  tenant predicate) and `PATCH /api/owner/notifications/:id/read` (role + row ownership) in
  server/routes/admin.routes.js, server/routes/owner.routes.js,
  server/controllers/admin.controller.js, server/controllers/owner.controller.js
- [ ] T018 [US3] Wire read actions into client/js/admin.js + client/js/owner.js lists (click marks
  read where authorized)
- [ ] T019 [US3] Run T016 green + full suite in tests/ (no regressions)

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 — Failed orders stay silent (Priority: P2)

**Goal**: Notifications mirror persisted orders exactly — zero for failures, one set per
persisted order (plan S1; no new mechanism).

**Independent Test**: Failed validation, rejected rule, and replayed submission → notification
counts equal persisted order counts.

### Tests for User Story 4

- [ ] T020 [P] [US4] Silence test in tests/notifications.test.js (extend): failed submission →
  zero rows; replayed submission → rows equal persisted orders for that intent (no assumption
  about order deduplication — assert against actual order count)

### Implementation for User Story 4

- [ ] T021 [US4] Verify-only: T020 passes on correct fan-out placement (inside commit); fix only
  gaps T020 proves in server/services/orders.service.js (no new mechanism per spec)

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Burst proof, validation, and review gates.

- [ ] T022 Burst proof in tests/notifications.test.js (extend): 50 concurrent orders → exact
  notification sets per recipient (none lost/duplicated/misassigned)
- [ ] T023 [P] Full validation: `npm run check`, each suite in tests/ in isolation,
  specs/005-order-notifications/quickstart.md end-to-end; record results
- [ ] T024 [P] Re-validate specs/005-order-notifications/checklists/requirements.md against
  delivered work (read-only; do not modify markers)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all stories (migration + service shell).
- **User Stories (Phases 3–6)**: Depend on Foundational; required order US1 → US2 (feed builds
  on fan-out); US3/US4 after US1.
- **Polish (Phase 7)**: Depends on all stories.

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies. 🎯 MVP.
- **US2 (P1)**: After US1 — platform feed reuses fan-out rows.
- **US3 (P2)**: After US1 — read endpoints need feed rows.
- **US4 (P2)**: After US1 — silence is a property of fan-out placement.

### Parallel Opportunities

- T001 + T002 (different concerns); T005 + T006 (same new file — write sequentially, run
  together after); T023 + T024. Stories US3/US4 can parallelize once US1 lands.

---

## Parallel Example: User Story 1

```bash
# Write US1 tests together (must FAIL before T007–T010):
Task: "Offline-inbox test in tests/notifications.test.js"
Task: "Online-appearance test in tests/notifications.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: US1 (T005–T011)
4. **STOP and VALIDATE**: offline inbox + live appearance independently green.

### Incremental Delivery

Setup + Foundational → US1 (MVP) → US2 → US3/US4 → Polish. Each phase independently
testable; rollback per slice is `git revert` (migration 021 additive).

---

## Notes

- [P] tasks = different files, no dependencies
- Every task carries an ID, story label (story phases), and exact file path
- Data-model constraints quoted verbatim: `type='new_order'` CHECK, `is_read DEFAULT FALSE`,
  recipient scoping by `restaurant_id` + `role='admin'` / `role='owner'` + `is_active`
- No new dependencies, frameworks, or services in any task
