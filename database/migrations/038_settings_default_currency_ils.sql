-- 038_settings_default_currency_ils.sql — new restaurants default to ILS
-- (the primary market) instead of USD. ADDITIVE ONLY: existing rows are
-- untouched; only the column default for future INSERTs changes.
-- The application also defaults to ILS in createRestaurant() and in the
-- storefront display fallback, so this is defence in depth, not the
-- only place the default lives.

ALTER TABLE restaurant_settings ALTER COLUMN currency SET DEFAULT 'ILS';
