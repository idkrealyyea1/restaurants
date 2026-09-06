-- 006_subscription.sql — restaurant subscription window.
-- NULL (or a future date) means the subscription is active; a past date means expired.
-- The owner/billing layer will eventually set this; for now it defaults to active.

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ NULL;
