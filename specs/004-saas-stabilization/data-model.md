# Data Model (stabilization-relevant)

Source: `database/migrations/001-018` + services. Only entities the plan touches.

## restaurants

- `id` uuid PK, `slug` unique (regex + reserved list, `utils/checks.js`), `name`, `is_active`,
  `status` (open/closed), `subscription_ends_at`, `max_menu_items`.
- Plan impact: S4 (staff create-only) writes here via existing `owner.createRestaurant`; no schema
  change. Subscription gating reads `subscription_ends_at` in order creation, bookings, `attachUser`
  (`requireRestaurantAdmin`), login.

## users

- `id`, `restaurant_id → restaurants CASCADE` (null for owner/staff), `delivery_group_id →
  delivery_groups CASCADE` (delivery role only), `role ∈ (owner, admin, staff, delivery)`,
  `username/email` (lowercased lookup), `password_hash` (bcrypt 12), `is_active`.
- Plan impact: S3 retires the `delivery` role path (no new delivery users; existing rows handled per
  migration decision in R2). S4 restricts `staff` at route-guard level; no schema change.
  Deactivation/password change already revokes sessions (`DELETE FROM "session" WHERE
  sess->>'userId'`).

## restaurant_settings (+ hours)

- `restaurant_id` PK → restaurants CASCADE; contact fields, `delivery_fee_cents`,
  `whatsapp`, `timezone`, `currency`, theme colors; `restaurant_hours(day 0-6, open/close HH:MM)`;
  `017` added `settings.name_en`.
- Plan impact: S5 adds the delivery-enabled toggle here (name TBD in tasks; e.g.
  `delivery_enabled bool DEFAULT true` — backward compatible, existing behavior preserved).
  Order creation reads `delivery_fee_cents` when `orderType=delivery`; after S5 it also requires the toggle.

## categories / menu_items

- Both `restaurant_id → restaurants CASCADE`; items add `category_id → categories CASCADE`,
  `price_cents`, `is_available`, `is_popular`, `image_path` (regex-validated `/uploads/...`).
- Plan impact: read-only for most slices; S7 verifies index/query discipline on menu + order lists.

## orders / order_items

- `orders`: `restaurant_id → restaurants CASCADE`, `code` 8-char unique, `status ∈ (pending,
  confirmed, preparing, ready, out_for_delivery, completed, cancelled)`, `order_type ∈
  (pickup, delivery)`, totals in cents (server-computed), `archived_at` (lists filter NULL).
- `order_items`: `order_id → orders CASCADE`, `menu_item_id → menu_items SET NULL`, snapshotted
  `name/unit_price_cents`, `created_at` (002).
- Lifecycle: `TRANSITIONS` in `orders.service.js:45-54`; `changeStatus` validates, `cancelByCustomer`
  allows pending|confirmed within grace (`CANCEL_GRACE_MINUTES=15`, `config/index.js:106`).
  `updateStatus` (unexported) skips validation — see R6.
- Plan impact: S2 (burst tests pin current correct behavior; double-submit fix in `createCheckout`),
  S5 (delivery toggle enforced in `createCheckout`), S9 (grace atomicity: re-check time in the UPDATE).

## bookings

- `restaurant_id → restaurants CASCADE`, `code`, `status ∈ (pending, confirmed, cancelled,
  completed, noshow)`, `booked_at`, `tables_count`, contact fields.
- Plan impact: S2 adds a DB-enforced overlap guarantee (R3). OPEN ITEMS for tasks: (1) window
  duration source — no duration exists in payload, validator, or schema, so tasks MUST decide fixed
  house window vs new field and record the ceiling; (2) probe `btree_gist` for the exclusion
  constraint, fallback to parent-row `FOR UPDATE` serialization; (3) check existing rows for overlaps
  before constraining (backfill decision).

## delivery_groups / restaurant_delivery_groups

- Groups + join to restaurants; `users.delivery_group_id` for delivery logins.
- Plan impact: S3 retires provisioning; tables kept read-only until S3's migration decision
  (history vs drop). No order-creation logic may depend on them after S5.

## leads / search_runs / restaurant_requests / platform_settings

- Out of scope (CRM deferred per D3) except: `platform_settings(id=1, pricing_cents=1999)` is the
  canonical price (migration 018); S6 reconciles user-facing strings to it. `restaurant_requests`
  write path keeps existing rate limit; no changes.

## "session" / uploaded_files / schema_migrations

- Sessions: `connect-pg-simple` table; no changes. Uploads: `uploaded_files(path PK, mime, bytes)`,
  magic-byte verified; S8 covers orphan/failure-path audit. Migrations: append-only, idempotent,
  `schema_migrations` gate (`migrate.js`).
