# Research: SaaS Stabilization (004)

Date: 2026-09-25. Method: direct code inspection (grep + targeted reads). Every Decision below
names the verifying path. "Fact" = seen in code. "Recommendation" = judgment.

## R1 — Staff remit change is a route-guard edit, not a redesign

- Decision: Implement staff-create-only by changing guards in `server/routes/owner.routes.js` plus
  `tenantId()` in `server/controllers/admin.controller.js:25-34`.
- Rationale: Fact — `owner.routes.js:12-53` puts `requireOwnerOrStaff` on ~15 routes (overview,
  restaurants CRUD, admins, orders, delivery-groups, accounts) with `forbidStaffDelete` blocking only
  DELETE. D-clarify (staff creates restaurants only) therefore means: staff keeps
  `POST /restaurants` (line 16, minus `forbidStaffDelete` for staff?) and loses the other 14.
  Simplest correct form: replace `requireOwnerOrStaff` with `requireOwner` everywhere except
  `POST /restaurants`, and make `tenantId()` deny staff outright.
- Alternatives: per-route allowlist in controllers (rejected — guards already exist, reuse them).
- Open verification: `owner.createRestaurant` also creates the restaurant's admin user
  (`owner.controller.js:90-93` validates username/email/password) — confirm staff-created restaurants
  still bootstrap an admin login, else staff flow is dead on arrival.

## R2 — Delivery retirement touches routes, roles, and two tables

- Decision: Retire in three ordered steps: (1) stop provisioning (owner account-CRUD routes
  `owner.routes.js:50-53` + `delivery.routes.js` login/dashboard), (2) add per-restaurant delivery
  toggle honoring FR-003b, (3) resolve `delivery_groups` / `restaurant_delivery_groups` /
  `users.delivery_group_id` (migrations 005, 007) as history-or-drop in a backward-compatible migration.
- Rationale: Fact — `delivery.service.js:175-190` confirms the delivery status path and its
  ready→completed skip; with D4 the whole path goes, so the skip question is moot. Fact — order
  creation reads `delivery_fee_cents` from settings, so the toggle belongs in `restaurant_settings`.
- Alternatives: keep tables untouched forever (rejected — dead schema confuses every future agent;
  but removal is last, after serving + tests prove no dependency).

## R3 — Booking overlap needs a DB-enforced guarantee (not an app-level check)

- Fact: `bookings` (`008_bookings.sql`) has `booked_at TIMESTAMPTZ`, `tables_count`, NO duration/end
  column, NO overlap guard of any kind; `bookings.service.js:create` (lines 22-51) inserts outside
  any transaction. `withTx` (`server/db/pool.js:25-43`) is plain `BEGIN/COMMIT` (read committed).
  Payload and validator carry no duration (`restaurant.js:455-456`, `validators/index.js:257-269`).
  Migrations already use extensions (`001_init.sql:3` pgcrypto); `FOR UPDATE` on the parent
  restaurant row is the established serialization pattern (`orders.service.js:87`,
  `menu.service.js:50`).
- Decision: an application-level overlap `SELECT` inside a normal transaction is NOT accepted as
  concurrency proof (a concurrent committer can slip between check and insert under read
  committed). Tasks MUST pick a mechanism guaranteeing two conflicting transactions cannot both
  commit, in this order:
  1. Probe `btree_gist` on the disposable DB first. If available → exclusion constraint on
     `tstzrange(booked_at, ends_at)` scoped to `restaurant_id`, predicated to non-terminal
     statuses; conflicting concurrent commit fails at the database (map to clean 409). Probe
     existing rows for overlaps BEFORE adding the constraint (backfill decision in tasks).
  2. If the extension is unavailable → serialize booking creation on the parent `restaurants` row
     (`SELECT ... FOR UPDATE`, same pattern as order creation) with the overlap `EXISTS` check and the
     insert in the same transaction. Per-restaurant serialization; contention with order creation noted
     as the ceiling (`ponytail:` comment).
- Alternatives: advisory `pg_advisory_xact_lock` (rejected — lock-key discipline across all writers
  is easier to silently break than a constraint or the existing FOR UPDATE pattern); serializable
  isolation (rejected — retry plumbing across the codebase for one race).
- Open item for tasks (genuine unknown, do NOT invent): window duration source — fixed house window
  vs new payload/schema field. Record the chosen ceiling explicitly.
- Race test (mandatory): N concurrent conflicting attempts → exactly 1 success + N−1 clean 409s;
  concurrent non-conflicting attempts → all succeed (proves serialization is per-restaurant).

## R4 — Vanilla re-point is a `server/app.js` + verification slice

- Decision: Order is verify-live → re-point `CLIENT_DIR` (`server/app.js:29`, currently
  `frontend/dist`) to `client/` → adjust explicit SPA routes (`app.js:125-159`: `/app`, `/resources`,
  `/restaurant/:slug`, `/track`, `/delivery`, `/leads`, `/offer/:code`, manifest, sw) → smoke →
  delete React only on zero references.
- Rationale: Fact — `app.js:29` + 15 `sendFile(CLIENT_DIR...)` lines; zero `client/` references in
  server/config/package/app.yaml (verified by grep). Vanilla `client/` has 21 pages vs 8 explicit
  routes, so `express.static(client, {extensions:['html']})` covers the rest; confirm each marketing
  page resolves before deleting the bundle.
- Alternatives: keep serving dist (rejected by D1).

## R5 — Test strategy reuses the existing harness, adds concurrency

- Decision: All new tests extend `tests/` (`node --test`, disposable DB via `TEST_DATABASE_URL`,
  `tests/helpers.js` truncates + `listen(0)`). Add: cross-tenant probe matrix (extends
  `tenant-isolation.test.js`), order-submission burst + double-submit replay (new files), booking-overlap race (new file),
  staff-remit matrix (extends `auth.test.js` or new), delivery-toggle tests (extends `orders.test.js`).
- Rationale: Fact — harness refuses to run without `TEST_DATABASE_URL` (`helpers.js:15`), truncates
  core tables, serves on ephemeral port. New files: order-submission burst, double-submit replay,
  booking-overlap race. No new framework needed (constitution XV, XVIII).
- Alternatives: external load tool (rejected — `node --test` + concurrent promises suffice for 50-burst).

## R6 — Downgraded risks (verified less severe than survey suggested)

- `orders.service.js:updateStatus` (no transition check) is NOT exported (`module.exports:506-523`
  exposes only `changeStatus`, which validates via `assertTransition:280`). Recommendation: add an
  internal assert anyway (one line) so a future export can't bypass the machine; P3.
- `owner.createRestaurant` DOES validate `adminUsername/adminEmail/adminPassword`
  (`owner.controller.js:90-93`); only `trialDays`/`subscriptionEndsAt` (lines 75-81) parse inline.
  Recommendation: move those two into `validators/` with range checks; P2.
- Stale `$8.99/month` string lives in `bookings.service.js:29` (and `frontend/src/lib/i18n.tsx`);
  canonical price is 1999 (migration 018). Recommendation: single pricing constant or server-driven
  message; fixed automatically when React legacy is removed + vanilla strings reconciled; P2.

## R7 — Full rewrite NOT justified

- Decision: Incremental slices. Evidence: layered routes→controllers→services→SQL, parameterized
  queries throughout, transactional order creation with row locks, idempotent migrations, existing test
  harness with isolation coverage. Debt is localized (guards, booking race, dual frontend, string
  drift), each slice independently revertable.

## R8 — Duplicate order submission is a real, confirmed risk (F-DUP)

- Fact: `createCheckout` (`orders.service.js:77+`) inserts a new order on every call — no idempotency
  key, no dedupe. The only guard is the client disabling the button in flight
  (`client/js/restaurant.js:366-386`). A double-flight before disable, a browser retry after commit,
  or a slow-network double-click persists two orders. `orderLimiter` is IP-based (20/hour) and does
  not stop a double-click pair. There is no payment flow — duplicating an order means double
  fulfillment work, not double charging.
- Recommendation (smallest safe fix; tasks choose the minimum): client-generated submission key per
  order attempt (UUID in payload), stored with a unique constraint; a repeated key returns the
  existing order instead of inserting. No idempotency framework, no architecture change.
- Test: replay the same submission twice → single persisted order, second response references the
  first (no error, no duplicate).
