-- 002_order_items_created_at.sql — order_items lacked a created_at column that
-- queries rely on for stable line-item ordering.

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
