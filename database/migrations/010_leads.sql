-- 010_leads.sql — AI lead-to-customer sales system
-- ponytail: single table with JSONB for flexibility, add indexes for filters; normalize if >10k leads or need JOIN

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  restaurant_name TEXT NOT NULL CHECK (char_length(restaurant_name) BETWEEN 2 AND 120),
  city TEXT NOT NULL DEFAULT '' CHECK (char_length(city) <= 80),
  phone TEXT NOT NULL DEFAULT '' CHECK (char_length(phone) <= 40),
  whatsapp TEXT NOT NULL DEFAULT '' CHECK (char_length(whatsapp) <= 40),
  instagram TEXT NOT NULL DEFAULT '' CHECK (char_length(instagram) <= 120),
  facebook TEXT NOT NULL DEFAULT '' CHECK (char_length(facebook) <= 200),
  website TEXT NOT NULL DEFAULT '' CHECK (char_length(website) <= 300),
  menu_url TEXT NOT NULL DEFAULT '' CHECK (char_length(menu_url) <= 300),
  google_listing TEXT NOT NULL DEFAULT '' CHECK (char_length(google_listing) <= 300),
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_url TEXT NOT NULL DEFAULT '' CHECK (char_length(logo_url) <= 500),
  logo_path TEXT NOT NULL DEFAULT '' CHECK (char_length(logo_path) <= 300),
  cover_url TEXT NOT NULL DEFAULT '' CHECK (char_length(cover_url) <= 500),
  cover_path TEXT NOT NULL DEFAULT '' CHECK (char_length(cover_path) <= 300),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT '' CHECK (char_length(category) <= 80),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  date_discovered TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Scoring
  score INT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  score_reason TEXT NOT NULL DEFAULT '' CHECK (char_length(score_reason) <= 500),
  score_level TEXT NOT NULL DEFAULT 'COLD' CHECK (score_level IN ('HOT','WARM','COLD')),
  -- CRM pipeline
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','RESEARCHED','QUALIFIED','DEMO_GENERATED','CONTACTED','REPLIED','DEMO_VIEWED','TRIAL','CONVERTED','LOST')),
  -- Demo link
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  trial_username TEXT NOT NULL DEFAULT '' CHECK (char_length(trial_username) <= 80),
  trial_expires TIMESTAMPTZ,
  trial_status TEXT NOT NULL DEFAULT 'NONE' CHECK (trial_status IN ('NONE','ACTIVE','EXPIRED','CONVERTED')),
  -- Generated content
  offer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  messages JSONB NOT NULL DEFAULT '{}'::jsonb,
  assets JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Follow-up / CRM
  contact_date TIMESTAMPTZ,
  next_followup TIMESTAMPTZ,
  followups JSONB NOT NULL DEFAULT '[]'::jsonb,
  pipeline_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_city_idx ON leads(city);
CREATE INDEX IF NOT EXISTS leads_score_level_idx ON leads(score_level);
CREATE INDEX IF NOT EXISTS leads_score_idx ON leads(score DESC);
CREATE INDEX IF NOT EXISTS leads_date_idx ON leads(date_discovered DESC);
CREATE INDEX IF NOT EXISTS leads_restaurant_idx ON leads(restaurant_id);
CREATE INDEX IF NOT EXISTS leads_code_idx ON leads(code);
CREATE INDEX IF NOT EXISTS leads_trial_status_idx ON leads(trial_status);
