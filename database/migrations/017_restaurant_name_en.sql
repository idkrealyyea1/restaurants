-- 017_restaurant_name_en.sql — optional English display name per restaurant.
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS name_en TEXT CHECK (name_en IS NULL OR char_length(name_en) <= 80);
