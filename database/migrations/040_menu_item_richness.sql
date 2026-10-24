-- 040_menu_item_richness.sql — optional, nullable MenuX-style item fields.
-- ADDITIVE ONLY: every column is nullable and defaults to NULL, so existing
-- items are unchanged and the storefront shows a field only when it is set.
--   calories_cents: calories per serving (integer, >= 0)
--   prep_minutes:   preparation time in minutes (integer, >= 0)
--   allergen_note:  free-text allergen warning, e.g. "contains nuts"
--   badge:          short badge, validated by the API to a small allowlist
--                   (bestSeller, new, spicy, chefPick, vegetarian)
--   old_price_cents: struck-through previous price; shown with "save X"
--                   only when it is greater than the current price.

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS calories INTEGER CHECK (calories IS NULL OR calories >= 0),
  ADD COLUMN IF NOT EXISTS prep_minutes INTEGER CHECK (prep_minutes IS NULL OR prep_minutes >= 0),
  ADD COLUMN IF NOT EXISTS allergen_note TEXT,
  ADD COLUMN IF NOT EXISTS badge TEXT CHECK (badge IS NULL OR badge IN ('bestSeller', 'new', 'spicy', 'chefPick', 'vegetarian')),
  ADD COLUMN IF NOT EXISTS old_price_cents INTEGER CHECK (old_price_cents IS NULL OR old_price_cents >= 0);
