-- 015_platform_settings.sql — platform-wide pricing + branding editable from owner panel.
CREATE TABLE IF NOT EXISTS platform_settings (
  id                    SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pricing_cents         INTEGER NOT NULL DEFAULT 899 CHECK (pricing_cents >= 0),
  pricing_currency      TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(pricing_currency)=3),
  pricing_period        TEXT NOT NULL DEFAULT 'month' CHECK (pricing_period IN ('month','year')),
  trial_days            INTEGER NOT NULL DEFAULT 7 CHECK (trial_days BETWEEN 0 AND 365),
  brand_name            TEXT NOT NULL DEFAULT 'Restivo',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION set_platform_updated() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_platform_updated ON platform_settings;
CREATE TRIGGER trg_platform_updated BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION set_platform_updated();
INSERT INTO platform_settings (id, pricing_cents, pricing_currency, pricing_period, trial_days, brand_name)
VALUES (1, 899, 'USD', 'month', 7, 'Restivo')
ON CONFLICT (id) DO NOTHING;
