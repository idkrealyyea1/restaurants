-- 005_delivery_groups.sql — platform-level delivery companies that the owner
-- manages, and per-restaurant selection of which groups deliver for them.

CREATE TABLE IF NOT EXISTS delivery_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 80),
  phone      TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurant_delivery_groups (
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  group_id      UUID NOT NULL REFERENCES delivery_groups(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, group_id)
);
