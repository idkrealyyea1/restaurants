# Data Model: Order Notifications (005)

## notifications (new, migration 021)

- `id` uuid PK default `gen_random_uuid()`.
- `recipient_user_id` uuid NOT NULL → `users(id)` ON DELETE CASCADE (D1: one row per recipient).
- `restaurant_id` uuid NULL → `restaurants(id)` ON DELETE CASCADE (set for restaurant copies;
  set for platform copies too, as context — never as authorization).
- `order_id` uuid NOT NULL → `orders(id)` ON DELETE CASCADE.
- `type` TEXT NOT NULL DEFAULT `'new_order'` CHECK (`type = 'new_order'`; only order scope exists).
- `title` TEXT NOT NULL, `body` TEXT NOT NULL DEFAULT `''` (bilingual rendering stays in the
  client via `i18n.js`; stored strings are the fallback/identifier).
- `is_read` BOOLEAN NOT NULL DEFAULT FALSE.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`.
- Indexes: `(recipient_user_id, created_at DESC)`, `(recipient_user_id, is_read)` partial
  `WHERE is_read = FALSE` (unread counts), `(order_id)`.
- No backfill (new table starts empty — the 019 lesson). Append-only; rows are never updated
  except `is_read`, never deleted by the app.

## Touched existing entities (read-only unless noted)

- **orders**: read after insert inside `createCheckout` (code, totals for the payload). No schema
  change, no logic change.
- **users**: recipient lookup (`restaurant_id + role='admin' + is_active`; `role='owner' +
  is_active`). No schema change. Deactivation already revokes sessions and now also naturally
  stops fan-out.
- **restaurants**: tenant context for platform copies. No change.

## Validation rules (from FRs)

- Exactly one row per (order × recipient user): enforced by inserting from a
  `SELECT DISTINCT` recipient set inside the order transaction (no new constraint needed;
  recipient sets are disjoint by construction).
- `PATCH read`: `WHERE id=$1 AND recipient_user_id = caller`; restaurant rows additionally
  `AND restaurant_id = caller tenant`; owner rows require caller `role='owner'`.
- Unknown `type` values rejected; unknown fields on write paths ignored (existing validator
  convention).

## State transitions

- `is_read`: FALSE → TRUE only, by the owning recipient. No other mutation exists.
