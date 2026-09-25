-- 018_pricing_1999.sql — plan goes $8.99 -> $19.99 (trial stays 7 days).
UPDATE platform_settings SET pricing_cents = 1999 WHERE id = 1;
