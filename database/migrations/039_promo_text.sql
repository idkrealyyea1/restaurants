-- 039_promo_text.sql — optional storefront promo banner text.
-- ADDITIVE ONLY: empty by default, so existing restaurants show no banner
-- until they set one. Displayed escaped (never as HTML) on the storefront.

ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS promo_text TEXT NOT NULL DEFAULT '';
