# Feature Specification: SaaS Stabilization

**Feature Branch**: `004-saas-stabilization`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Professionalize and stabilize the existing Restaurant SaaS without changing its intended product behavior."

## Confirmed Facts (repository survey, 2026-09-25)

Facts below were verified by inspecting the repo. They bound the scope; they are not recommendations.

- Stack: Node >= 20, Express 4, PostgreSQL via `pg`, vanilla HTML/CSS/JS served app, no build step for the
  served path except the committed React bundle (see frontend note). Sessions server-side in Postgres
  (`connect-pg-simple`), bcrypt cost 12, helmet CSP, per-route rate limiters (in-memory).
- Layering: `server/routes → controllers → services → parameterized SQL`, `validators/` at trust
  boundaries, `database/migrations/*.sql` idempotent via `migrate.js` + `schema_migrations` (18 files,
  001–018). Money in cents, prices snapshotted into `order_items` at purchase.
- Roles: `owner` (platform), `admin` (restaurant), `staff` (platform helper), `delivery` (delivery company).
  Session stores only `userId`; `attachUser` reloads user + restaurant on each request.
- Tenant identity: restaurant admins scoped by `req.user.restaurant_id`; `owner`/`staff` pass
  `?restaurantId=` which is accepted without a membership check (`admin.controller.js:tenantId`).
- Order submission (`createCheckout`) runs in a transaction with `SELECT ... FOR UPDATE`, re-validates active status,
  subscription, open-hours, and availability; prices come only from the DB; codes are 8-char with retry
  on collision. Status machine `pending → confirmed → preparing → ready → out_for_delivery → completed`
  (+ `cancelled`), enforced in `changeStatus`. Customer cancel allowed only for `pending|confirmed`
  within a grace window. Bookings have a separate machine and no overlap guard on concurrent inserts.
- Served frontend is `frontend/dist` (committed React bundle, 331KB JS): `server/app.js` serves it
  statically with SPA fallbacks; zero references to `client/` exist in `server/`, `config/`,
  `package.json`, or `app.yaml`. The vanilla `client/` tree (21 pages, 17 JS modules) is unserved dead
  weight, as are root-level archives (`restivo-landing-frontend.zip`, `nowadded.html`, CSVs, PNGs).
- Business logic is duplicated across three implementations: `client/js/*`, `frontend/src/*`
  (totals, status labels, i18n dictionaries with conflicting prices, theme tokens), and the server
  (authoritative). i18n price strings disagree (`$19.99` vs `$8.99`); served-bundle source of truth TBD.
- Rate limiting and live-update events (SSE) are in-process/single-node only; documented as such in code.
- Tests: 6 suites under `tests/` (`node --test`, requires `TEST_DATABASE_URL` on a disposable DB),
  covering auth, menu limits, orders, tenant isolation, and v2 flows. `npm run check` syntax-gates deploys.
- Deploy: Wasmer Edge only (`app.yaml`, region `fr-roub1`), `migrate` runs on boot in prod, health check
  at `/api/healthz`. No deploy without explicit user approval.
- WhatsApp is a data field plus a `wa.me` deep link and lead-message templates; there is no outbound
  WhatsApp sender in `server/`. Public tracking (`/api/orders/track/:code`) and offer
  (`/api/offer/:code`) endpoints are unauthenticated short-code lookups.
- Duplicate-submission finding (F-DUP, inspected 2026-09-25): `createCheckout` inserts a new order
  on every call with no idempotency or dedupe mechanism; the only guard is the client disabling the
  submit button in flight (`client/js/restaurant.js:submitOrder`). A double-flight before disable, a
  browser retry after commit, or a slow-network double-click therefore persists two orders for one
  intent. The IP-based `orderLimiter` (20/hour) does not stop a double-click pair. No online payment
  exists anywhere in this flow — "order submission" here means creating a restaurant order for
  fulfillment, not paying.
- Canonical frontend decision (user, 2026-09-25): the vanilla HTML/CSS/JS `client/` tree is the
  canonical application. The React migration was abandoned; `frontend/` (scaffold, sources, and the
  committed `dist/` bundle) is legacy. Note the tension this creates: the repo's `server/app.js`
  currently serves `frontend/dist`, so restoring vanilla as the served frontend is itself in scope
  (verify → re-point → smoke → remove legacy only after confirming nothing depends on it). Live
  deployment state was not inspected; it MUST be verified before any serving change.

## Clarifications

### Session 2026-09-25

- Q: What should the `staff` platform role be allowed to do once authorization is tightened? → A: Staff
  can only add restaurants (create), nothing else.
- Q: May a delivery account mark an order `completed` straight from `ready`? → A: Moot — delivery
  accounts are retired entirely (see D4). No delivery login exists, so no delivery status path remains.
- Q: What counts as a conflicting booking that must never double-confirm? → A: Same restaurant plus
  overlapping time window (FR-009).
- Q: Should legacy removal also delete stale root-level archives and docs? → A: Only confirmed-obsolete
  files, classified first (used / doc-reference / useful asset / confirmed obsolete) and reported
  before deletion; never auto-delete docs, data, media, or history for lack of code refs (FR-014).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tenant isolation holds under adversarial use (Priority: P1)

A restaurant admin for restaurant A (and a logged-out visitor) attempts to read or change data
belonging to restaurant B: orders, menu, settings, hours, analytics,
reports, and uploads. Every attempt is denied without leaking data, while legitimate same-tenant work
is unaffected.

**Why this priority**: Cross-tenant leakage is the highest-severity failure a multi-tenant SaaS can
have. Everything else is secondary until isolation is proven.

**Independent Test**: Run a cross-tenant probe matrix (owner/admin/staff/visitor × every
tenant-scoped operation, including `?restaurantId=` swapping and direct object IDs) and confirm 100%
denial with zero data in responses. Deliverable: probe script + passing run.

**Acceptance Scenarios**:

1. **Given** an admin session for restaurant A, **When** requesting restaurant B's orders (by swapped
   `restaurantId` or direct order ID), **Then** access is denied and no B data is returned.
2. **Given** a `staff` platform session, **When** accessing restaurant data without an assigned tenant,
   **Then** only explicitly permitted operations succeed and each is server-authorized.
3. **Given** a retired delivery credential (if any still exists), **When** used against any endpoint,
   **Then** access is denied; no delivery login or dashboard remains.

---

### User Story 2 - Orders stay correct under concurrent submission (Priority: P1)

During a dinner rush, many customers submit orders at the same time: items sell out, an item is
deactivated after a customer starts ordering, two customers grab the last table slot, and a customer
cancels at the edge of the grace window. Every successful submission creates exactly one correct
order (server-priced); legitimately rejected submissions fail cleanly with no order and no partial
writes. Separately, when one customer accidentally submits the same order twice (double-click, slow
network, browser retry), the system MUST NOT persist two orders for that single intent.


**Why this priority**: Money and availability correctness under concurrency is the core promise of an
ordering system; race bugs here lose revenue and trust.

**Independent Test (burst — concern A)**: Fire 50 simultaneous order submissions from different
customers (same items, overlapping slot bookings, cancel-at-deadline) against a disposable database
and assert each successful submission creates exactly one correct order, legitimate rejections create
nothing, and totals are correct.

**Independent Test (duplicate — concern B, separate test)**: Replay the same customer's submission
twice (double-click, retry) and assert a single persisted order for that intent.

Deliverable: burst test run + duplicate test run, both passing.

**Acceptance Scenarios**:

1. **Given** an item deactivated after ordering starts, **When** the order is submitted, **Then** it is
   rejected with a clear message and no order is created.
2. **Given** two customers booking overlapping time windows at the same restaurant simultaneously,
   **When** both submit, **Then** at most one booking is confirmed and the other gets a clear rejection.
3. **Given** a customer cancelling at the grace-window edge, **When** cancel is submitted, **Then** the
   outcome is deterministic (cancelled xor kept) with no partial state.
4. **Given** a customer whose order submission is sent twice (double-click, retry), **When** both
   requests reach the server, **Then** exactly one order is persisted for that intent.

---

### User Story 3 - Untrusted input is rejected server-side (Priority: P2)

A customer or admin submits malformed, oversized, or malicious input (bad quantities, forged totals,
wrong types, oversized payloads, bad uploads, unknown fields on sensitive writes). The server rejects
each case with a safe message; no invalid data reaches the database and frontend validation is never
the only line of defense.

**Why this priority**: Every trust boundary that relies on the browser is an open door; closing them is
cheap and prevents whole classes of bugs.

**Independent Test**: Submit a hostile-input battery against order submission, bookings, menu, settings, and
upload operations; assert rejection + safe messages + clean database state.

**Acceptance Scenarios**:

1. **Given** an order submission with forged totals or prices, **When** submitted, **Then** server prices win and
   the order total matches the database, not the request.
2. **Given** an upload with mismatched content type or over the size cap, **When** submitted, **Then**
   it is rejected and nothing is stored.

---

### User Story 4 - Roles and subscriptions gate correctly (Priority: P2)

A staff member attempts any platform operation; only adding a restaurant succeeds while everything
else is denied. An expired-subscription restaurant keeps its data but cannot accept new orders.
Delivery is a per-restaurant setting: the restaurant admin enables or disables it on the settings
page, customers see the delivery option only when enabled, and delivery orders for a
delivery-disabled restaurant are rejected. Login abuse is throttled.

**Why this priority**: Authorization drift (permissions wider than intended) silently accumulates in
AI-assisted codebases; subscription gating is revenue-critical.

**Independent Test**: Exercise the role × operation matrix plus expired/active subscription states and
assert each outcome matches the documented rule.

**Acceptance Scenarios**:

1. **Given** an expired subscription, **When** a customer checks out, **Then** the order is refused with
   a clear restaurant-closed message and existing data is untouched.
2. **Given** a staff session, **When** adding a restaurant, **Then** creation succeeds; **When**
   attempting any other operation (view, edit, delete, orders, admins, delivery groups, accounts),
   **Then** access is denied.
3. **Given** a restaurant with delivery disabled, **When** a customer submits a delivery order,
   **Then** it is rejected with a clear message; pickup ordering is unaffected.

---

### User Story 5 - Vanilla restored as the served frontend, React legacy retired (Priority: P2)

The vanilla `client/` application is served again as the production frontend. The abandoned React
leftovers (`frontend/` sources, committed `dist/` bundle, build config) are identified, confirmed
dependency-free (no server, config, deploy, or test references the bundle), and only then removed.
The vanilla implementation itself is preserved and improved — never edited merely to match abandoned
React code — and conflicting React-copied strings (e.g. price displays) are resolved in favor of the
vanilla/server values. All served pages pass the smoke suite after each step.

**Why this priority**: The repo currently serves the abandoned bundle while the canonical app sits
unserved; every day in this state risks fixes landing in the wrong tree. Restoring one canonical
served frontend removes the ambiguity at the root.

**Independent Test**: Verify live deployment state, re-point serving to vanilla behind verification,
run the full smoke suite (all key pages, ordering, dashboards, robots/sitemap, 404 behavior) plus a
string-consistency check; then a dependency scan proves nothing references `frontend/dist` before any
React file is deleted.

**Acceptance Scenarios**:

1. **Given** serving is re-pointed to vanilla, **When** the smoke suite runs, **Then** every served
   page and flow behaves exactly as the vanilla app defines.
2. **Given** React legacy removal is proposed, **When** the reference scan runs across server,
   config, deploy, tests, scripts, and docs, **Then** zero references exist before deletion.
3. **Given** root-level cleanup is proposed, **When** files are classified, **Then** only
   confirmed-obsolete files are listed for deletion, the list is reported first, and docs, data,
   media, and history-bearing files are preserved.
3. **Given** the cleanup is complete, **When** searching served pages for price/plan strings, **Then**
   exactly one consistent value appears, matching the server's platform pricing.

---

### User Story 6 - Failures are diagnosable without leaking secrets (Priority: P3)

When something breaks (database error, failed order submission, expired session, migration hiccup), operators
can find the cause in logs with enough context to act, while customers see only safe, useful messages
and never internals, tokens, or stack traces.

**Why this priority**: Unobservable systems turn every incident into guesswork; safe errors are a
compliance-level expectation.

**Independent Test**: Trigger representative failures and assert each produces a correlated log entry
and a safe client message (verified no secret/token/stack leakage in responses).

**Acceptance Scenarios**:

1. **Given** a failed order submission due to a backend error, **When** the customer retries, **Then** they see
   a clear safe message and the failure is traceable in logs.
2. **Given** any 4xx/5xx response, **When** inspected, **Then** it contains no secrets, tokens, or
   stack traces.

---

### User Story 7 - Key flows stay fast under load (Priority: P3)

Menu browsing, order submission, order tracking, and dashboards remain responsive while many customers and
restaurants use the system concurrently, with no unbounded queries, runaway payloads, or obvious N+1
patterns on hot paths.

**Why this priority**: Performance work is wasted without a target, but hot-path query discipline is
prerequisite to any scale claim.

**Independent Test**: Load the hot paths at 10× development traffic (bursts of 50 simultaneous order
submissions, sustained 10 order submissions/minute) and assert 95% of interactions complete within 2 seconds
with zero lost orders; profile and fix N+1/unbounded queries found.

**Acceptance Scenarios**:

1. **Given** target concurrent browsing and order-submission load (10× development traffic: bursts of 50
   simultaneous order submissions, sustained 10 order submissions/minute), **When** measuring hot-path responses,
   **Then** 95% of interactions complete within 2 seconds with zero lost or duplicated orders.
2. **Given** a restaurant with a large menu and order history, **When** opening menu/orders/analytics,
   **Then** pages load within thresholds (paginated, bounded payloads).

---

### Edge Cases

- Order submission for an item deactivated between menu load and submit → clean rejection, no order.
- Two bookings with overlapping time windows at the same restaurant in the same second → exactly
  one confirmation.
- Cancel submitted exactly at the grace-window boundary → deterministic single outcome.
- Short tracking/offer codes guessed or enumerated → no data leakage, throttled.
- Subscription expiring mid-session → ordering stops, dashboards remain readable.
- SSE/live-event disconnect during an order rush → admin sees consistent state on reconnect.
- Migration re-run on an already-migrated database → no-op, no data change.
- Staff session presenting another tenant's `restaurantId` → denied, logged.
- Delivery order submission for a restaurant with delivery disabled → clean rejection, pickup unaffected.
- Same order submission delivered twice (double-click, retry) → single persisted order, no duplicate.
- Retired delivery credentials presented anywhere → denied; no delivery login or dashboard remains.
- Upload of a file with a forged extension/MIME → rejected before storage.
- In-memory rate limits and SSE under multi-node operation → limitation documented; behavior stays
  correct on the current single-node deployment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every tenant-scoped operation MUST deny cross-tenant access for all roles, including via
  swapped identifiers, direct object IDs, and query parameters.
- **FR-001b**: The `staff` role MUST be authorized for restaurant creation only; every other operation
  MUST be denied for staff sessions.
- **FR-002**: Order-submission and booking totals, fees, and availability MUST be computed server-side from
  database prices; client-supplied money MUST be ignored.
- **FR-003**: Order and booking status changes MUST follow the defined lifecycle; invalid transitions
  MUST be rejected with a clear message on every remaining path (restaurant admin, customer cancel).
  The separate delivery login/status path is retired (see D4).
- **FR-003b**: Whether a restaurant offers delivery MUST be a per-restaurant setting controlled by the
  restaurant admin; customers MUST see the delivery option only when it is enabled, and delivery
  order submissions for delivery-disabled restaurants MUST be rejected.
- **FR-004**: Restaurants with expired subscriptions MUST refuse new orders/bookings while preserving
  read access to their data.
- **FR-005**: Login MUST be throttled, failure messages MUST stay generic, and sessions MUST be
  regenerated on login and revoked on password change or deactivation.
- **FR-006**: Uploads MUST be restricted by type, size, and verified content, and served with safe
  headers; orphaned files MUST NOT accumulate on failure paths.
- **FR-007**: Unauthenticated code-based lookups (tracking, offers) MUST resist enumeration and expose
  only the minimum fields needed for their purpose.
- **FR-008**: Concurrent order submissions from different customers MUST each be processed
  correctly; each successful submission MUST create exactly one correct order, and legitimately
  rejected submissions MUST fail cleanly with no partial writes.
- **FR-008b**: A repeated submission of the same customer's order (double-click, slow-network retry,
  browser retry) MUST NOT persist a duplicate order. The investigation found a real risk (finding
  F-DUP below); tasks MUST implement the smallest safe fix compatible with the existing order flow —
  no idempotency framework, no architecture redesign.
- **FR-009**: Concurrent bookings for the same restaurant whose time windows overlap MUST NOT both
  confirm; losers get a clear rejection.
- **FR-010**: Customer cancellation MUST enforce the grace window atomically (status and time checked
  in the same write).
- **FR-011**: All user-controlled input MUST be validated server-side at trust boundaries; unknown
  fields on sensitive writes MUST be rejected.
- **FR-012**: Errors MUST be logged with actionable context and MUST return safe client messages with
  no secrets, tokens, or internals.
- **FR-013**: Live order/booking updates for admins MUST reconcile to consistent state on reconnect;
  single-node limitations MUST be documented.
- **FR-014**: The vanilla `client/` application MUST be the single served frontend. Abandoned React
  legacy (`frontend/` sources, build config, committed `dist/` bundle) MUST be removed only after
  verifying no references from the server, deployment config, tests, scripts, documentation, or other
  active project files. Root-level files MUST first be classified as actively used, documentation /
  reference, potentially useful asset, or confirmed obsolete; ONLY confirmed-obsolete files may be
  deleted, and the deletion list MUST be reported before deleting. Documentation, data, media,
  archives, and anything possibly holding project history or business information MUST NOT be deleted
  merely for having no code references, nor without explicit confirmation. The vanilla implementation
  MUST NOT be changed merely to match abandoned React code.
- **FR-015**: Served business logic (totals, status handling, user-facing strings) MUST have a single
  source of truth in the vanilla app plus the server; conflicting React-copied values MUST be
  resolved in favor of vanilla/server, never the reverse.
- **FR-016**: Security-sensitive behavior (isolation, transitions, authorization, money) MUST be covered
  by automated tests runnable on a disposable database.
- **FR-017**: `npm run check` MUST pass and the key-route smoke suite MUST be green before any deploy;
  production-readiness MUST never be claimed from a diff alone.
- **FR-018**: Hot paths (menu, order submission, tracking, dashboards, analytics, reports) MUST use bounded,
  paginated queries with no N+1 patterns, and meet response thresholds at target load.
- **FR-019**: Anything that breaks if the app ever runs on more than one node (rate limits, live
  events) MUST be documented with its ceiling and hardening path.
- **FR-020**: Deployment MUST remain Wasmer-compatible with no new services or dependencies; environment
  variables and secrets handling MUST be documented and verified end to end.

### Key Entities

- **Restaurant**: tenant root; slug, active flag, subscription window, settings, hours.
- **User**: identity with role (`owner`, `admin`, `staff`); scoped to a restaurant where applicable;
  active flag. (The `delivery` role and delivery account provisioning are retired per D4.)
- **Menu (Category, MenuItem)**: restaurant-scoped catalog with availability and prices in cents.
- **Order (+ OrderItems)**: customer purchase with server-computed totals, lifecycle status, tracking
  code, and snapshotted item prices.
- **Booking**: table reservation with party size, slot time, lifecycle status, and tracking code.
- **DeliveryGroup**: legacy grouping of restaurants to delivery companies; account provisioning on
  top of it is retired per D4 — the plan MUST resolve whether the tables stay for history or are
  retired with the accounts. Source of truth for "does this restaurant deliver" is the per-restaurant
  setting (FR-003b).
- **Lead / SearchRun**: sales-pipeline records and their discovery history (scope TBD — see Q3).
- **PlatformSettings**: singleton platform configuration including plan pricing.
- **UploadedFile**: validated binary stored in the database, referenced by path.
- **Session**: server-side login record bound to a user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cross-tenant probe matrix (all roles × all tenant-scoped operations) passes with zero
  leaked records and zero unauthorized writes.
- **SC-002**: A burst of 50 simultaneous customer order submissions is processed correctly: every
  successful submission creates exactly one correct order (totals match database prices to the
  cent); submissions legitimately rejected by business rules (unavailable item, closed restaurant,
  expired subscription) create nothing and fail cleanly with zero partial writes. The count of
  created orders equals the count of successful submissions — never assumed to be 50.
- **SC-003**: 100% of invalid lifecycle transitions attempted across admin and customer paths
  are rejected with a clear message; valid flows complete end to end.
- **SC-004**: Expired-subscription restaurants accept zero new orders while retaining dashboard read
  access; reactivation restores ordering without data repair.
- **SC-005**: Full automated suite plus syntax check plus key-route smoke (ordering, dashboards, tracking,
  robots, sitemap, 404 behavior) pass consecutively from a clean tree.
- **SC-006**: At 10× development traffic (bursts of 50 simultaneous order submissions, sustained 10
  order submissions/minute), 95% of hot-path interactions complete within 2 seconds with zero lost or
  duplicated orders.
- **SC-007**: Served pages come from the vanilla app; no React bundle is served or referenced;
  user-facing strings (plan, price) are consistent everywhere and match server platform pricing.

## Assumptions

- Existing user-visible behavior is the intended behavior; change only what is demonstrably broken,
  insecure, or superseded (constitution I).
- Work ships incrementally in small, reviewable, revertable slices; no rewrites for style (II, XX).
- No conversion to React or any framework change; no new services, queues, caches, or infrastructure
  (XVIII, XIX, XVII).
- Production data is never touched by tests or probes; all verification runs on disposable databases
  (IX, XXI).
- Arabic-default UX, single-URL structure, SEO/static-marketing behavior, and the 19.99 plan price are
  unchanged unless a follow-up spec says otherwise.
- Sales/CRM tooling (leads, search runs, offers, outreach templates) is deferred to a follow-up
  spec; this spec hardens the ordering core first (tenants, auth, money, concurrency).
- Load target is 10× current development traffic on the existing single-node Wasmer deployment
  (bursts of 50 simultaneous order submissions, sustained 10 order submissions/minute).

## Out of Scope

- Sales/CRM hardening (leads, search runs, offers, outreach) — deferred to a follow-up spec
  (`/speckit.specify`).
- New product features, UI redesigns, or pricing/plan changes.
- Framework migration or architecture replacement.
- New infrastructure (caches, queues, multi-region, additional services).
- Changes to production data or the production database outside backward-compatible migrations.
- Any deploy (explicit user approval required per constitution XXI).

## Decisions (answered 2026-09-25, scope finalized)

- **D1 — Canonical frontend is vanilla**: React migration abandoned; `frontend/` is legacy, removed
  only after proven dependency-free. Vanilla is preserved, never edited to match React.
- **D2 — Target scale is 10× dev traffic**: bursts of 50 simultaneous order submissions, sustained 10
  order submissions/minute; 95% of hot-path interactions within 2 seconds.
- **D3 — Ordering core first**: sales/CRM hardening deferred to a follow-up spec.
- **D5 — Order-submission terminology, no payment flow**: "checkout" is banned from requirements —
  the flow is customer order submission for fulfillment, and this SaaS processes no online payments
  (no gateway, no cards). Concurrency (many customers at once) and duplicate submission (one
  customer, same intent twice) are separate concerns with separate acceptance (US2 scenarios 1–3 vs
  scenario 4; FR-008 vs FR-008b).
- **D4 — Delivery accounts retired**: the platform no longer provisions delivery accounts or logins.
  Whether a restaurant offers delivery is a per-restaurant setting controlled by the restaurant admin
  on the settings page; customers see the delivery order option only when it is enabled. Delivery
  status updates are handled through the restaurant admin flow. (User, 2026-09-25.)
