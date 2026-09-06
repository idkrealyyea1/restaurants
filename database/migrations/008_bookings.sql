-- 008_bookings.sql — table reservations (book a table)

CREATE TABLE IF NOT EXISTS bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL UNIQUE,
  restaurant_id      UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name      TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 80),
  customer_whatsapp  TEXT NOT NULL,
  customer_phone     TEXT,
  tables_count       INTEGER NOT NULL CHECK (tables_count BETWEEN 1 AND 20),
  booked_at          TIMESTAMPTZ NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','cancelled','completed','noshow')),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_restaurant_booked_idx ON bookings (restaurant_id, booked_at DESC);
CREATE INDEX IF NOT EXISTS bookings_restaurant_status_idx ON bookings (restaurant_id, status);
CREATE INDEX IF NOT EXISTS bookings_code_idx ON bookings (code);

CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
