-- 019_booking_overlap.sql — DB-enforced booking overlap guarantee + order submission key
--
-- A) Booking overlap: exclusion constraint on [booked_at, ends_at) per restaurant,
--    predicated to non-terminal statuses. Concurrent conflicting inserts cannot
--    both commit: the loser gets exclusion_violation (23P01), mapped to 409.
--    Window length (120 min) mirrors BOOKING_SLOT_MINUTES in bookings.service.js;
--    see R3. DEPLOY NOTE: scan existing rows for overlaps before applying to a
--    database with production data — pre-existing overlaps will fail validation.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- Backfill + enforce NOT NULL only when safe (no NULLs remain afterwards by construction).
UPDATE bookings SET ends_at = booked_at + INTERVAL '120 minutes' WHERE ends_at IS NULL;
ALTER TABLE bookings ALTER COLUMN ends_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING gist (
        restaurant_id WITH =,
        tstzrange(booked_at, ends_at) WITH &&
      )
      WHERE (status NOT IN ('cancelled', 'completed', 'noshow'));
  END IF;
END $$;

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
