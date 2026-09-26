# Research: Order Notifications (005)

Date: 2026-09-26. Method: direct code inspection. "Fact" = seen in code.

## R1 — Fan-out inside the existing checkout transaction

- Decision: Insert notification rows inside `createCheckout`'s current `withTx` block
  (`orders.service.js`), after the order + items inserts, before commit. Recipients are read
  in the same transaction (active admins of the restaurant + active owners).
- Rationale: Fact — the route (`public.routes.js:39-70`) calls `createCheckout`, then
  broadcasts, then responds. Atomicity both ways falls out for free: a failed order rolls
  back its notifications (FR-003), and a committed order always has its notifications
  (FR-001/002/011). No new failure mode beyond a DB error, which already fails the order.
- Alternatives: separate insert after commit (rejected — a crash between commit and insert
  loses notifications, violating the offline core); outbox/queue (rejected — new infra,
  banned by FR-013).

## R2 — Platform SSE needs no hub change

- Decision: Subscribe owner dashboards to a reserved `__platform__` channel key; broadcast the
  platform copy there. New `GET /api/owner/events` endpoint mirrors the admin one.
- Rationale: Fact — `sse.js` keys `clients` by arbitrary Map key (`addClient(restaurantId,
  res)`); a string key works with zero hub changes. Admin channel behavior is untouched.
- Alternatives: per-restaurant owner subscriptions (rejected — owners must see all
  restaurants); second hub (rejected — duplication).

## R3 — Recipient queries reuse existing columns

- Decision: Restaurant recipients = `users WHERE restaurant_id=$1 AND role='admin' AND
  is_active`; platform recipients = `users WHERE role='owner' AND is_active`. Staff excluded
  (no restaurant scope, D-004-era remit); delivery role retired.
- Rationale: Fact — `users` carries `role`, `restaurant_id`, `is_active` with supporting
  indexes (`users_restaurant_idx`); session revocation on deactivation already exists, so a
  deactivated admin simply stops receiving.
- Alternatives: separate subscription table (rejected — no opt-out requirement exists).

## R4 — Read endpoints authorize by row ownership

- Decision: `PATCH .../notifications/:id/read` updates `WHERE id=$1 AND
  recipient_user_id=req.user.id` (restaurant rows additionally constrained by the caller's
  tenant via join). Owner feed rows carry `restaurant_id` for context but authorize on
  `role='owner'`, never on tenant.
- Rationale: Per-user rows (D1) make ownership checks one predicate; tenant check reuses the
  `tenantId()` choke point (004). Matches contracts/isolation-matrix.md conventions.
- Alternatives: shared read-anything-in-tenant (rejected — violates FR-008 across admins).

## R5 — UI extends existing dashboards, bilingual strings

- Decision: Bell + unread count + dropdown/list in `admin.js`/`owner.js` reusing `toast`,
  `api`, `esc` helpers and `i18n.js` dictionaries; click navigates to the existing order view.
  New `notificationBell`-style keys in both `ar`/`en` dicts.
- Rationale: Fact — no notification center exists (only toasts); dashboards already refetch
  views on SSE `onopen` (T050), so the list reconciles after reconnects for free.
- Alternatives: separate notifications page (rejected — spec forbids a separate app).

## R6 — Migration 021, additive and empty-safe

- Decision: `021_notifications.sql` creates one table + indexes; no backfill, no constraint
  risk on existing data (new table starts empty — the 019 lesson applied).
- Alternatives: none considered; this is the only backward-compatible shape.
