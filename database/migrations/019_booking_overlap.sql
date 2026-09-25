-- 019_booking_overlap.sql — booking overlap support + order submission key
--
-- NOTE (2026-09-25): the exclusion-constraint variant of this migration failed
-- on the production database ("could not create exclusion constraint"), taking
-- boot down with it. Overlap is instead enforced by serializing booking creation
-- on the parent restaurant row (same pattern as order creation) with an overlap
-- check in the same transaction — see bookings.service.js create(). This file
-- therefore only adds additive, always-safe columns; it creates NO constraint.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- Backfill + enforce NOT NULL only when safe (no NULLs remain afterwards by construction).
UPDATE bookings SET ends_at = booked_at + INTERVAL '120 minutes' WHERE ends_at IS NULL;
ALTER TABLE bookings ALTER COLUMN ends_at SET NOT NULL;

-- B) Order submission key: lets a retried submission return the original order
--    instead of inserting a duplicate (FR-008b). NULL for rows created before
--    clients send keys; uniqueness enforced only for keyed rows.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS submission_key UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_submission_key_uniq') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_submission_key_uniq
      UNIQUE (restaurant_id, submission_key);
  END IF;
END $$;
