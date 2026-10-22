-- 036_rebrand_ordora.sql — force the platform brand to Ordora for existing installs.
ALTER TABLE platform_settings ALTER COLUMN brand_name SET DEFAULT 'Ordora';

UPDATE platform_settings
SET brand_name = 'Ordora'
WHERE id = 1;
