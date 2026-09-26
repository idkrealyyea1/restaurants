# Feature Specification: Order Notifications

**Feature Branch**: `005-order-notifications`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Add a new persistent order-notification feature to the existing restaurant SaaS. (in-app only; offline-safe; two audiences: restaurant users and platform admin)"

## Confirmed Facts (repository survey, 2026-09-26)

Facts verified by inspecting the repo; they bound the scope.

- Order creation: `POST /api/restaurants/:slug/orders` → `orders.service.js:createCheckout`
  (transactional, server-priced). On success the route broadcasts `order:new` via `sse.js`.
- Real-time today: `server/middleware/sse.js` is an in-process per-restaurant hub (`Map
  restaurantId → Set<res>`); events vanish on restart and never reach offline browsers. No
  persistence anywhere in this path.
- No notification center exists. The only notification-like UI is toast popups in
  `client/js/admin.js` (`newOrderToast`/`newBookingToast` on live SSE events). No bell, no
  unread count, no list, in either dashboard.
- Roles: `owner` (platform), `admin` (restaurant, scoped by `req.user.restaurant_id`), `staff`
  (platform, restaurant-creation only), `delivery` retired. Tenant identity comes only from the
  authenticated user record (`attachUser`), enforced at `tenantId()` (004).
- Dashboards are vanilla HTML/JS: `client/admin.html` + `client/js/admin.js` (restaurant),
  `client/owner.html` + `client/js/owner.js` (platform). No React (retired, deleted).
- Migrations are append-only and idempotent (`migrate.js` + `schema_migrations`); the runner
  aborts boot on failure, so new migrations must succeed on existing production data.
- Tests run per-file against a disposable DB (`TEST_DATABASE_URL`); multi-file runs share one
  DB and interfere — always run suites separately.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Restaurant admin never misses an order (Priority: P1)

A diner submits an order at Restaurant A late at night when no admin browser is open. The order
commits; a notification is stored. In the morning the admin opens the dashboard and immediately
sees an unread indicator with the new order listed; clicking it opens that order. If the admin
had been online, the same notification would have appeared without a refresh — but nothing
depends on that: the stored notification is the truth.

**Why this priority**: Missed orders are lost revenue — the core failure this feature exists to
prevent.

**Independent Test**: Place an order with no dashboard session open, then open the dashboard and
assert the notification appears unread; repeat with a live dashboard session and assert it
appears without refresh. Deliverable: passing notification tests.

**Acceptance Scenarios**:

1. **Given** no admin browser session for Restaurant A, **When** a customer order commits, **Then**
   a stored unread notification exists for Restaurant A's authorized users.
2. **Given** an unread notification exists, **When** the admin opens the dashboard, **Then** the
   unread indicator and list show it without any prior real-time delivery.
3. **Given** a live admin dashboard session, **When** a customer order commits, **Then** the
   persisted notification additionally appears without a page refresh.

---

### User Story 2 - Platform admin sees every restaurant's orders (Priority: P1)

A diner orders from Restaurant A and another from Restaurant B. Each platform admin sees both
notifications, each identifying its restaurant and order. Restaurant A's admins see only A's;
Restaurant B's admins see only B's.

**Why this priority**: Tenant isolation for notifications is a security property, not a nicety.

**Independent Test**: Place orders at two restaurants; assert each restaurant session sees only
its own notifications and the platform session sees both with correct restaurant context.

**Acceptance Scenarios**:

1. **Given** orders at Restaurants A and B, **When** Restaurant A's admin lists notifications,
   **Then** only A's appear.
2. **Given** the same orders, **When** a platform admin lists notifications, **Then** both appear,
   each identifying its restaurant and order.
3. **Given** a notification for Restaurant A, **When** Restaurant B's admin requests it directly,
   **Then** access is denied with no data leaked.

---

### User Story 3 - Read state is personal and authorized (Priority: P2)

An admin with ten unread notifications marks three as read (by opening or dismissing them); the
count drops to seven and stays there across logout and login. One admin's reads never affect
another admin's view, and nobody can mark someone else's notification read.

**Why this priority**: Shared or leaky read state destroys trust in the indicator.

**Independent Test**: Two admin sessions, overlapping notifications; mark read in one, assert the
other is unaffected and state survives re-login.

**Acceptance Scenarios**:

1. **Given** unread notifications, **When** an authorized user marks one read, **Then** it shows
   read for that user only and the unread count decreases by one.
2. **Given** a notification belonging to another user or restaurant, **When** marked read,
   **Then** the request is denied and nothing changes.
3. **Given** read notifications, **When** the user logs out and back in, **Then** read state
   persists.

---

### User Story 4 - Failed orders stay silent (Priority: P2)

A customer submits an order with an unavailable item: it fails, and no notification is created.
Another customer submits the same order twice: whatever the existing order flow persists
determines the notifications — one persisted order yields exactly one notification set, and this
feature neither assumes nor implements order deduplication itself.

**Why this priority**: Phantom notifications send kitchens chasing ghosts.

**Independent Test**: Failed validation and rejected business-rule submissions each produce zero
new notifications; each successfully persisted order produces exactly one notification set for
its intended recipients — no more, regardless of how many times it was submitted.

**Acceptance Scenarios**:

1. **Given** an order submission rejected by validation or business rules, **When** checked,
   **Then** no new-order notification exists for that attempt.
2. **Given** a repeated submission, **When** checked, **Then** the notification count equals the
   persisted order count for that intent (one order → one set), without this feature altering
   order persistence behavior.

---

### Edge Cases

- 50 concurrent orders across restaurants → each order yields exactly its intended
  notifications, none lost, none assigned to the wrong restaurant.
- Admin opens dashboard mid-burst → unread count matches stored unread rows, no duplicates.
- Notification for an order later cancelled → notification remains as history (assumption;
  records the event, not live state).
- Subscription-expired restaurant → no orders can commit, hence no notifications.
- SSE disconnect during an order rush → missed toasts backfilled from the stored list on
  reconnect (existing `onopen` refresh pattern covers this).
- Very old notifications → retained indefinitely (assumption; no auto-expiry in scope).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every successfully committed customer order MUST produce a persisted notification
  for each authorized user of that restaurant, exactly once per user.
- **FR-002**: Every successfully committed customer order MUST produce a persisted notification
  for platform administration identifying the restaurant and the order, exactly once per
  platform recipient.
- **FR-003**: Notification creation MUST happen only for committed orders — never for failed
  validation, rejected submissions, or uncommitted attempts.
- **FR-004**: Notifications MUST be readable by recipients who were offline at creation time,
  loaded from storage on dashboard open/login, shown unread.
- **FR-005**: Online recipients MUST additionally see new notifications without a page refresh,
  delivered over the existing real-time channel as a faster copy of the stored row — never as
  a substitute for it.
- **FR-006**: Restaurant users MUST see only their own restaurant's notifications; direct access
  to another restaurant's notification MUST be denied without leaking data.
- **FR-007**: Platform notification access MUST be authorized separately from restaurant tenant
  authorization (owner-role check, not tenant scoping).
- **FR-008**: New notifications MUST start unread; marking read MUST be authorized per-recipient;
  one user's reads MUST NOT affect another user's state.
- **FR-009**: The restaurant dashboard MUST show an unread indicator/count, a notification list
  with read/unread state, and navigation from a notification to its order where authorized.
- **FR-010**: The platform dashboard MUST show the same capabilities over the platform feed.
- **FR-011**: Concurrent successful orders MUST each yield exactly their intended notifications
  — none lost, none duplicated by concurrency, none misassigned across restaurants.
- **FR-012**: The feature MUST NOT change order business logic, pricing, subscriptions, or
  existing concurrency/tenant protections.
- **FR-013**: No new services, frameworks, or dependencies; no SMS/email/WhatsApp/push; vanilla
  dashboards only.

### Key Entities

- **Notification**: stored record with ID, recipient user, optional restaurant context, order
  reference, type (`new_order`), title/message, read/unread state, creation timestamp.
- **Restaurant User (admin role)**: recipient scope for restaurant notifications (users bound to
  a restaurant; platform `staff` excluded — they hold no restaurant scope).
- **Platform Admin (owner role)**: recipient scope for the platform feed.
- **Order**: the triggering event; only committed orders generate notifications.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With no dashboard session open, a committed order is visible as an unread
  notification within one dashboard load after login.
- **SC-002**: With a live dashboard session, a committed order appears in the notification UI
  without a page refresh.
- **SC-003**: Cross-restaurant probe (A↔B sessions plus direct-ID access) shows zero leaked
  notifications and zero unauthorized reads.
- **SC-004**: A burst of 50 concurrent orders yields exactly the intended notification sets —
  zero missing, zero duplicates, zero misassigned.
- **SC-005**: Failed submissions yield zero new notifications; each persisted order yields
  exactly one notification set for its intended recipients.
- **SC-006**: Read-state actions by one user leave all other users' states unchanged, verified
  across logout/login.

## Assumptions

- Recipient model: one stored notification row per recipient user (decided D1).
- Platform audience is every active `owner`-role user; restaurant audience is every active
  `admin`-role user bound to that restaurant.
- Marking read is per-notification; no bulk mark-all in scope unless Q&A decides otherwise.
- Notifications are retained indefinitely; no expiry or cleanup job in scope.
- Clicking a notification opens the existing order view (filtered/focused); no new pages.
- Notification text is bilingual via the existing `i18n.js` dictionaries.
- Existing session auth, SSE hub, and migration conventions are reused as-is.

## Out of Scope

- SMS, email, WhatsApp, third-party push, mobile apps.
- Booking notifications, payment notifications, marketing notifications.
- Pricing, subscription, or order-business-logic changes.
- React, WebSockets, Redis, Firebase, external services, new dependencies.
- Notification expiry/retention policies (retained indefinitely per assumption).

## Decisions (answered 2026-09-26, scope finalized)

- **D1 — Per-user notification rows**: each recipient gets their own stored row (read state is a
  column); no shared rows, no read-receipts table.

## Open Questions

(none — Q1 resolved as D1.)
