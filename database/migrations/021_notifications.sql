-- 021_notifications.sql — persistent per-user order notifications (005, D1)
--
-- One row per recipient user (read state is a column). New table starts empty,
-- so this migration is safe on any existing database. Rows are never updated
-- except is_read, never deleted by the app.

CREATE TABLE IF NOT EXISTS notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id      UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type               TEXT NOT NULL DEFAULT 'new_order' CHECK (type = 'new_order'),
  title              TEXT NOT NULL,
  body               TEXT NOT NULL DEFAULT '',
  is_read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON notifications (recipient_user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS notifications_order_idx ON notifications (order_id);
