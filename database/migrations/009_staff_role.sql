-- 009_staff_role.sql — add platform staff (can do everything except delete restaurants and see passwords)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'staff', 'delivery'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_restaurant_or_delivery;
ALTER TABLE users ADD CONSTRAINT users_restaurant_or_delivery CHECK (
  (role = 'owner') OR
  (role = 'staff') OR
  (role = 'admin' AND restaurant_id IS NOT NULL) OR
  (role = 'delivery' AND delivery_group_id IS NOT NULL)
);
