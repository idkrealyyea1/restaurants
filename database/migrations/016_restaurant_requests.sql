-- 016_restaurant_requests.sql — public request form for owners wanting their own page
CREATE TABLE IF NOT EXISTS restaurant_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 80),
  restaurant_name TEXT NOT NULL CHECK (char_length(restaurant_name) BETWEEN 2 AND 80),
  phone TEXT NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 20),
  whatsapp TEXT NOT NULL CHECK (char_length(whatsapp) BETWEEN 7 AND 20),
  city TEXT NOT NULL DEFAULT '' CHECK (char_length(city) <= 60),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS restaurant_requests_created_idx ON restaurant_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS restaurant_requests_status_idx ON restaurant_requests(status);
CREATE OR REPLACE FUNCTION set_restaurant_request_updated() RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_restaurant_requests_updated ON restaurant_requests;
CREATE TRIGGER trg_restaurant_requests_updated BEFORE UPDATE ON restaurant_requests FOR EACH ROW EXECUTE FUNCTION set_restaurant_request_updated();
