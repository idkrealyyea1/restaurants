# Baseline (T001–T002) — 2026-09-25

`npm run check`: 75 files, 0 failures. Disposable DB: local PG17 container, fresh `restivo_test`.
Each suite run in isolation (`node --test tests/<file>.test.js`); multi-file runs interfere via
shared-DB TRUNCATEs (pre-existing harness trait — always run files separately).

## Per-file results (clean tree + T003/T004 helpers; failures identical with helpers stashed)

- auth: 8 pass / 0 fail
- menu: 3 pass / 2 fail — "category CRUD duplicate rejection" (201 vs 409), "deleting a category
  cascades its items" (409 MENU_LIMIT_REACHED). Pre-existing, environmental (PG17 image behavior).
- misc: 9 pass / 0 fail
- orders: 7 pass / 2 fail — "pickup order priced server-side", "delivery adds delivery fee".
  Pre-existing; root cause TBD (may relate to fee/settings handling — watch in US2/US4).
- tenant-isolation: 10 pass / 0 fail
- v2: 5 pass / 2 fail — "admin analytics AOV breakdowns", "delivery group + account" ×2.
  Delivery-account tests assert behavior D4 retires; US4 (T031) MUST update/remove them.

## Smoke

Not run against a live server in this phase (no prod touch). Served-path smoke belongs to US5 (T037)
after the vanilla re-point. Quickstart checklist deferred to T047.
