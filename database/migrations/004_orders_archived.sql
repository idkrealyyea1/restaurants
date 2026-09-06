-- 004_orders_archived.sql — soft-delete ("archive") for finished orders so
-- restaurants can clear them from the dashboard while all money they carried
-- remains counted in revenue/analytics.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
