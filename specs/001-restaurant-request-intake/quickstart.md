# Quickstart: Restaurant Request Intake

**Feature**: 001-restaurant-request-intake | **Date**: 2026-09-22

## Prerequisites

- `npm ci`, no DB needed for static checks; disposable PG for API tests via `TEST_DATABASE_URL`.
- `npm run check` passes.

## Validate US1 — Submit request

1. `node -e "boot app, POST /api/restaurant-requests {}"` → expect 400 `customerName is required`, no row.
2. POST valid `{customerName:'Ahmad Test',restaurantName:'Mataam Test',phone:'+972599123456',whatsapp:'+972599123456'}` → 201 `{code}` (needs DB; without DB expect 500 envelope, not 201 — confirms validation passed, storage needs DB).
3. Open `/` → `#request-form` exists, `mk-food-thumb` emoji present, submit empty → inline Arabic error, no fetch.

## Validate US2 — Owner inbox

1. `GET /api/owner/restaurant-requests` anon → 401 UNAUTHORIZED.
2. Login as owner → GET list → 200 `{total,requests[]}`; PATCH status → badge updates; DELETE → row gone.
3. Open `/owner.html` → `#requests-card` + `#requests-zone` table + `wa.me` link.

## Validate US3 — Lightweight hero

1. Load `/` → hero has 4 `.mk-menu-card` with `.mk-food-thumb` (🍔🍕🍰🥤), zero `fetch('/api/restaurants')` for hero, zero `/uploads` for hero.
2. Throttle 2G → skeleton `#app-skeleton` paints first, hides on load, no broken `<img>`.

## Expected outcomes

- All smoke checks PASS locally without deploy.
- `npm run check` 66 files 0 failures.
- No `wasmer deploy` run.
