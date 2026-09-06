-- 001_init.sql — initial schema for the multi-restaurant ordering platform.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- restaurants (tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  -- Open / Closed / Temporarily Closed — enforced server-side at checkout
  status         TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'closed', 'temporarily_closed')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  max_menu_items INTEGER NOT NULL DEFAULT 30 CHECK (max_menu_items BETWEEN 1 AND 10000),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT restaurants_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 63)
);

CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- users (platform owners + restaurant admins)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  username      TEXT NOT NULL,
  email         TEXT,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_admin_needs_restaurant CHECK (role <> 'admin' OR restaurant_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_restaurant_idx ON users (restaurant_id);

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- restaurant settings (1:1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurant_settings (
  restaurant_id        UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  description          TEXT NOT NULL DEFAULT '',
  phone                TEXT NOT NULL DEFAULT '',
  whatsapp             TEXT NOT NULL DEFAULT '',
  address              TEXT NOT NULL DEFAULT '',
  timezone             TEXT NOT NULL DEFAULT 'UTC',
  logo_path            TEXT,
  cover_path           TEXT,
  primary_color        TEXT NOT NULL DEFAULT '#e11d48',
  secondary_color      TEXT NOT NULL DEFAULT '#111827',
  currency             TEXT NOT NULL DEFAULT 'USD',
  delivery_fee_cents   INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  ignore_opening_hours BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settings_color_hex_1 CHECK (primary_color ~* '^#[0-9a-f]{6}$'),
  CONSTRAINT settings_color_hex_2 CHECK (secondary_color ~* '^#[0-9a-f]{6}$'),
  CONSTRAINT settings_currency CHECK (char_length(currency) = 3 AND currency ~* '^[a-z]{3}$')
);

CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- opening hours (one row per weekday, 0 = Sunday)
-- closes_at <= opens_at means the range crosses midnight.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurant_hours (
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_closed     BOOLEAN NOT NULL DEFAULT FALSE,
  opens_at      TIME NOT NULL DEFAULT '09:00',
  closes_at     TIME NOT NULL DEFAULT '22:00',
  PRIMARY KEY (restaurant_id, day_of_week)
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_len CHECK (char_length(name) BETWEEN 1 AND 60),
  UNIQUE (restaurant_id, name)
);

CREATE INDEX IF NOT EXISTS categories_restaurant_idx ON categories (restaurant_id, position);

-- ---------------------------------------------------------------------------
-- menu items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  price_cents  INTEGER NOT NULL CHECK (price_cents >= 0),
  image_path   TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular   BOOLEAN NOT NULL DEFAULT FALSE,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT items_name_len CHECK (char_length(name) BETWEEN 1 AND 100)
);

CREATE INDEX IF NOT EXISTS items_category_idx ON menu_items (category_id, position);
CREATE INDEX IF NOT EXISTS items_restaurant_idx ON menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS items_popular_idx ON menu_items (restaurant_id) WHERE is_popular;

CREATE TRIGGER trg_items_updated BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- orders + order_items (prices snapshotted at purchase time)
-- status stored as TEXT with CHECK for simple parameterized queries.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL UNIQUE,
  restaurant_id      UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name      TEXT NOT NULL,
  customer_whatsapp  TEXT NOT NULL,
  customer_phone     TEXT,
  customer_address   TEXT,
  order_type         TEXT NOT NULL CHECK (order_type IN ('pickup', 'delivery')),
  notes              TEXT,
  subtotal_cents     INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  total_cents        INTEGER NOT NULL CHECK (total_cents >= 0),
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','preparing','ready',
                                       'out_for_delivery','completed','cancelled')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_restaurant_created_idx ON orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (restaurant_id, status);
CREATE INDEX IF NOT EXISTS orders_code_idx ON orders (code);

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name       TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

-- ---------------------------------------------------------------------------
-- sessions (express-session / connect-pg-simple store)
-- The store can also create this itself; defined here as schema-of-record.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "session" (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS session_expire_idx ON "session" (expire);

-- ---------------------------------------------------------------------------
-- migration bookkeeping
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
