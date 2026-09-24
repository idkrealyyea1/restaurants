-- 011_lead_memory.sql — robust dedup + memory
-- ponytail: minimal add, reuse leads table + JSONB, normalize if needed

-- Add normalized + memory columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS normalized_name TEXT NOT NULL DEFAULT '' CHECK (char_length(normalized_name) <= 120);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_place_id TEXT NOT NULL DEFAULT '' CHECK (char_length(google_place_id) <= 120);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_discovered TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_researched TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_status TEXT NOT NULL DEFAULT 'NONE' CHECK (demo_status IN ('NONE','GENERATED','FAILED'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_status TEXT NOT NULL DEFAULT 'NONE' CHECK (contact_status IN ('NONE','CONTACTED','REPLIED','NOT_REPLIED'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS response_status TEXT NOT NULL DEFAULT '' CHECK (char_length(response_status) <= 30);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS not_interested_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS not_interested_note TEXT NOT NULL DEFAULT '' CHECK (char_length(not_interested_note) <= 500);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cooldown_ends_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS possible_duplicate_of UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_possible_duplicate BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS display_id SERIAL; -- will be set via sequence, ponytail: keep code as permanent ID, display_id for LEAD-000123
-- Fix status check to include new values — drop old, add new
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('NEW','RESEARCHED','QUALIFIED','DEMO_GENERATED','CONTACTED','REPLIED','DEMO_VIEWED','TRIAL','CONVERTED','LOST','NOT_INTERESTED','POSSIBLE_DUPLICATE'));

-- Indexes for dedup
CREATE INDEX IF NOT EXISTS leads_normalized_idx ON leads(normalized_name);
CREATE INDEX IF NOT EXISTS leads_phone_idx ON leads(phone) WHERE phone <> '';
CREATE INDEX IF NOT EXISTS leads_whatsapp_idx ON leads(whatsapp) WHERE whatsapp <> '';
CREATE INDEX IF NOT EXISTS leads_instagram_idx ON leads(instagram) WHERE instagram <> '';
CREATE INDEX IF NOT EXISTS leads_website_domain_idx ON leads(website) WHERE website <> '';
CREATE INDEX IF NOT EXISTS leads_google_place_idx ON leads(google_place_id) WHERE google_place_id <> '';
CREATE INDEX IF NOT EXISTS leads_cooldown_idx ON leads(cooldown_ends_at) WHERE cooldown_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_possible_dup_idx ON leads(possible_duplicate_of) WHERE possible_duplicate_of IS NOT NULL;

-- Search history
CREATE TABLE IF NOT EXISTS search_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL DEFAULT '' CHECK (char_length(query) <= 200),
  city TEXT NOT NULL DEFAULT '' CHECK (char_length(city) <= 80),
  location TEXT NOT NULL DEFAULT '' CHECK (char_length(location) <= 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  results_found INT NOT NULL DEFAULT 0 CHECK (results_found >= 0),
  new_leads INT NOT NULL DEFAULT 0 CHECK (new_leads >= 0),
  duplicates INT NOT NULL DEFAULT 0 CHECK (duplicates >= 0),
  possible_duplicates INT NOT NULL DEFAULT 0 CHECK (possible_duplicates >= 0),
  updated_existing INT NOT NULL DEFAULT 0 CHECK (updated_existing >= 0)
);
CREATE INDEX IF NOT EXISTS search_runs_created_idx ON search_runs(created_at DESC);

-- Backfill normalized_name for existing leads
UPDATE leads SET normalized_name = LOWER(TRIM(REGEXP_REPLACE(restaurant_name, '\s+', ' ', 'g'))) WHERE normalized_name = '';
UPDATE leads SET last_discovered = date_discovered WHERE last_discovered IS NULL;
-- Ensure display_id set for existing rows (SERIAL default only for new)
DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT id FROM leads WHERE display_id IS NULL LOOP UPDATE leads SET display_id = nextval('leads_display_id_seq') WHERE id = r.id; END LOOP; END $$;
