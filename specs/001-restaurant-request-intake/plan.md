# Implementation Plan: Restaurant Request Intake

**Branch**: `001-restaurant-request-intake` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-restaurant-request-intake/spec.md`

## Summary

Add public lead capture (`POST /api/restaurant-requests` + Arabic form on `/` + owner inbox on `/owner.html`) and lightweight hero food thumbs (inline emoji/CSS, zero fetches), reusing existing Express routes→controllers→services→PG, validators, rate-limiters, and marketing shell. No new deps, no deploy.

## Technical Context

**Language/Version**: Node.js >=20 (package.json engines), vanilla JS frontend, no framework

**Primary Dependencies**: express 4.21, pg 8.14, express-rate-limit 7.5, helmet 8.1, express-session + connect-pg-simple (existing, no new)

**Storage**: PostgreSQL (Wasmer managed or DATABASE_URL); new `restaurant_requests` via `database/migrations/016_restaurant_requests.sql` idempotent; existing `migrate.js` + `schema_migrations`

**Testing**: `node --test tests/` (requires explicit `TEST_DATABASE_URL` disposable) + `node scripts/check-syntax.js` (65 files must pass) + manual curl smoke (`/`, `/app/`, `/restaurant/:slug`, `/api/pricing`, `/api/restaurant-requests` validation, owner 401)

**Target Platform**: Wasmer Edge (fr-roub1, `app.yaml` name `restaurants`), browsers mobile-first RTL Arabic

**Project Type**: web-service (Express API) + static marketing/storefront (vanilla HTML/CSS/JS)

**Performance Goals**: Hero paints with HTML (0 hero API calls), form submit <3s, owner list 10 rows <5s, skeleton first paint <200ms, marketing HTML <30KB hero

**Constraints**: CSP `default-src 'self'` (no inline scripts except existing pattern — new form JS must be external or already-allowed inline? Use external `site.js` pattern or page inline-block allowed by `scriptSrc 'self'`? Must use external file, not inline); `orderLimiter` 20/hour; single URL Arabic; `noindex` private; no ephemeral disk (PG bytea only, but requests need no images)

**Scale/Scope**: <500 active restaurants in sitemap, <10k requests table before normalize, 1 feature dir, 3 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] I. Multi-tenant: requests are platform-level (no restaurant_id), owner-only read via `requireOwner`; no tenant param spoofing.
- [x] II. Server-authoritative: validation in `validators.validateRestaurantRequest`, no client totals; rate-limited.
- [x] III. Minimal additive: reuse `orderLimiter`, `orderCode()`, `validatePagination`, `owner.controller` pattern; no new deps.
- [x] IV. Security: owner routes `requireOwner`, public POST sanitized (`requireText/cleanPhone/cleanText`), 401/403 for non-owner, error envelope hides PG details.
- [x] V. Static-first: form HTML baked in `/`, hero thumbs inline emoji/CSS, no `/api` on load; `robots/sitemap` unchanged except demo removal already done.

Post-design re-check: PASS — no new tables beyond one, no CSP violation (form JS externalized to `site.js` or page script with `scriptSrc 'self'`? Verified: page uses `<script src>` + small inline allowed? Must move inline to external to pass CSP — flagged for tasks).

## Project Structure

### Documentation (this feature)

```text
specs/001-restaurant-request-intake/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
client/
├── index.html              # #request form + hero thumbs
├── css/marketing.css       # .mk-request + .mk-food-thumb
├── js/site.js              # request submit handler (external, CSP-safe)
├── js/owner.js             # loadRequests()
├── owner.html              # #requests-card
database/migrations/016_restaurant_requests.sql
server/
├── routes/public.routes.js # POST /restaurant-requests
├── routes/owner.routes.js  # GET/PATCH/DELETE /restaurant-requests
├── controllers/owner.controller.js # list/update/delete
├── services/restaurantRequests.service.js
├── validators/index.js     # validateRestaurantRequest
tests/                      # node:test (existing, no new suite required for MVP)
```

**Structure Decision**: Reuse existing monolith layout; no new top-level dirs. Docs in `specs/001-restaurant-request-intake/`, code in place.

## Complexity Tracking

No constitution violations requiring justification.
