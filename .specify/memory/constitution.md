<!-- Sync Impact Report:
Version change: 0.0.0 (template) → 1.0.0 (initial ratification for Restivo brownfield)
Modified principles: all 5 template placeholders replaced with repo-grounded rules
Added sections: Stack & Architecture Constraints, Security & Multi-tenancy, UX/SEO/Performance
Removed sections: none (template slots filled, no deferred slots)
Follow-up TODOs: none — all placeholders resolved from README/HANDOFF/package.json/app.yaml
-->
# Restivo Constitution

## Core Principles

### I. Multi-Tenant Isolation (NON-NEGOTIABLE)
Restaurant identity MUST be derived only from the authenticated user's DB record (`req.user.restaurant_id` via `attachUser`), never from request params, query, or body. Every tenant query MUST be scoped by `restaurant_id`. Owner/staff cross-tenant access MUST be explicit (`?restaurantId=` + `requireOwnerOrStaff`) and still server-checked. Violation blocks release.

### II. Server-Authoritative Money & Availability
All totals, fees, availability, open-hours, and subscription gating MUST be computed server-side from DB prices (cents) and server clock/timezone. Client-sent totals/prices MUST be ignored. Checkout, bookings, and status transitions MUST re-validate `is_active`, `status`, hours, and `subscription_ends_at`. No client trust for money or gating.

### III. Minimal Additive Change (Ponytail Ladder)
Prefer reuse over new code: existing helper → stdlib → native platform → installed dep → one-liner → minimal new code. No new dependencies, frameworks, or abstractions with single use. No speculative features. Deletion over addition. Bug fix MUST target root cause in shared function, not per-caller patch. Every change MUST preserve `/api/*`, auth, dashboards, `/restaurant/:slug`, and `/app/` compatibility unless spec explicitly allows breakage with migration.

### IV. Security & Privacy by Default
Passwords bcrypt cost 12, never returned. Sessions server-side in Postgres, HttpOnly + SameSite=Lax, `__Host-` + Secure in prod, regenerate on login, revoke on reset/deactivation. Parameterized SQL only. Strict CSP (`default-src 'self'`, no inline scripts). Origin guard on mutating requests. Uploads magic-byte sniffed, MIME allow-listed, size-capped, stored as `bytea` in `uploaded_files` (never ephemeral disk). Rate-limit `global/auth/order` in-process. Error envelope MUST hide internals in prod.

### V. Static-First Marketing, Live App Untouched
Marketing (`/`, `/features.html`, `/pricing.html`, `/for-*.html`, `/contact.html`, `/resources/`) MUST be static HTML with baked-in Arabic-default content for crawler readability; JS `i18n.js` is enhancement only. Single URL (no `/en` + `/ar` split); `lang=ar dir=rtl` default. Private pages (`login/admin/owner/delivery/leads/track/app`) MUST carry `noindex`. `robots.txt` allows marketing + `/restaurant/`, disallows `/api/admin/owner/delivery/leads`. `sitemap.xml` includes only canonical public URLs + active restaurants (max 500). Images lazy except hero; hero visuals MUST add zero extra API/DB requests (inline emoji/CSS).

## Stack & Architecture Constraints
Runtime Node >=20, Express 4, PostgreSQL via `pg` (`DATABASE_URL` or Wasmer `DB_*` with TLS `rejectUnauthorized:false`), vanilla HTML/CSS/JS, no build step, no TypeScript. Structure: `server/routes → controllers → services → parameterized SQL`, `validators/` mass-assignment safe, `database/migrations/*.sql` idempotent via `migrate.js` + `schema_migrations`, cents for money, snapshot prices at purchase. Frontend served by `express.static(client, {extensions:['html']})` + explicit `/app`, `/restaurant/:slug`, `/track`, `/resources` routes; `site.routes.js` only for `robots.txt`/`sitemap.xml`/`/r/:slug` 301. Config in `config/index.js` fails fast on weak prod secrets or localhost DB. Deploy Wasmer Edge `app.yaml` `name:restaurants` `fr-roub1`, `anybuild` remote, CDN 1h cache.

## Development Workflow
TDD for non-trivial logic (branch/loop/parser/money/security) with smallest runnable check (`node --test tests/` requires explicit `TEST_DATABASE_URL` on disposable DB; never prod). `npm run check` (`scripts/check-syntax.js`) MUST pass (0 failures) before any deploy. Manual smoke: `/`, `/app/`, `/restaurant/:slug`, `/track`, login, dashboards, pricing fetch, robots, sitemap, 404 HTML vs JSON. Skeleton loader (`skeleton.css/js`) MUST paint first on every HTML page and hide on `load` + 3.8s fallback, with offline retry. Owner-editable pricing via `platform_settings(id=1, pricing_cents 899)` + `GET /api/pricing` public fallback + `PATCH /api/owner/platform-pricing`. No deploy without explicit user approval (`dont deploy till we finish`).

## Governance
Constitution supersedes all other practices. Amendments require doc update, version bump (MAJOR breaking governance, MINOR new principle, PATCH wording), and migration note. All PRs/reviews MUST verify I–V compliance. Complexity MUST be justified with YAGNI note. Use `HANDOFF.md` + `README.md` + `a.md` as runtime guidance.

**Version**: 1.0.0 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-09-22
