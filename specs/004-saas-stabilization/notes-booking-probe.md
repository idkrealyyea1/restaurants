# Booking Probe (T004) — 2026-09-25

Disposable DB: local `supabase/postgres:17` container (`restivo-test-db`), NOT production.

## Findings

- `btree_gist`: AVAILABLE. Exclusion constraint trial (`EXCLUDE USING gist (r WITH =,
  during WITH &&)`) WORKS on this engine.
- Decision for T014: prefer the exclusion constraint on `tstzrange(booked_at, ends_at)` scoped to
  `restaurant_id`, predicated to non-terminal statuses. Fallback (parent-row `FOR UPDATE`) only if
  the deploy target lacks the extension — re-probe against Wasmer PG before migrating.
- Existing-overlap backfill: NOT CHECKED — the disposable DB holds no production data. T014 MUST
  scan production-like data for overlapping windows before adding the constraint, or the migration
  will fail on commit.
- Open (unchanged): window duration source — no duration in payload/validator/schema (see R3).
