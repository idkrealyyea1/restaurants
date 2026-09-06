-- 007_delivery_users.sql — delivery-company login accounts + dashboard support.
-- Adds a 'delivery' role to users, linked to a delivery_groups row, and lets the
-- owner toggle a company's availability.

ALTER TABLE delivery_groups ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_group_id UUID REFERENCES delivery_groups(id) ON DELETE CASCADE;

-- Widen the allowed roles to include 'delivery'.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'delivery'));

-- Replace the admin-restaurant linkage constraint with one covering delivery too.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_admin_needs_restaurant;
ALTER TABLE users ADD CONSTRAINT users_restaurant_or_delivery CHECK (
  (role = 'owner') OR
  (role = 'admin'  AND restaurant_id IS NOT NULL) OR
  (role = 'delivery' AND delivery_group_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS users_delivery_group_idx ON users (delivery_group_id);
