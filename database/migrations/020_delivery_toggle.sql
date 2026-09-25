-- 020_delivery_toggle.sql — per-restaurant delivery availability (FR-003b, D4)
--
-- Delivery is a per-restaurant setting, not a separate account system.
-- DEFAULT TRUE preserves existing behavior for all current restaurants.

ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE;
