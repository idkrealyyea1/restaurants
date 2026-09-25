# Restivo Constitution

## Core Principles

### I. Preserve Existing Functionality
Do not remove or change user-visible behavior unless it is demonstrably
broken, insecure, contradictory, or explicitly being replaced. Every change
MUST preserve `/api/*`, auth, dashboards, `/restaurant/:slug`, and `/app/`
compatibility unless the spec explicitly allows breakage with a migration.

### II. Small, Reviewable Changes
Prefer small, isolated changes over large rewrites. Never rewrite the
application merely for stylistic reasons. Each change MUST be reviewable in
one pass and revertable without collateral damage.

### III. Understand Before Modifying
Before modifying a module, inspect its callers, dependencies, data flow,
authN/authZ behavior, and related frontend/backend behavior. A fix in the
wrong place is a second bug; trace the real flow end to end first.

### IV. No Blind Assumptions
If behavior, DB structure, env vars, deployment, or business rules are
unclear, inspect the repo and config first. If it cannot be determined
safely, mark it NEEDS CLARIFICATION instead of inventing behavior.

### V. Multi-Tenant Isolation (NON-NEGOTIABLE)
Restaurant identity MUST come only from the authenticated user's DB record
(`req.user.restaurant_id` via `attachUser`), never from params, query, or
body. Every tenant query MUST be scoped by `restaurant_id`. Cross-tenant
owner/staff access MUST be explicit (`?restaurantId=` + `requireOwnerOrStaff`)
and still server-checked. Violation blocks release.

### VI. Security First
Never trust client-provided restaurant IDs, user IDs, prices, permissions,
or roles. Authorization MUST be validated server-side on every
sensitive operation. Sessions: server-side in Postgres, HttpOnly +
SameSite=Lax, `__Host-` + Secure in prod, regenerate on login, revoke on
reset/deactivation. Passwords bcrypt cost 12, never returned.
Parameterized SQL only. Strict CSP (`default-src 'self'`, no inline
scripts). Origin guard on mutating requests. Uploads: magic-byte sniffed,
MIME allow-listed, size-capped, stored as `bytea` in `uploaded_files`
(never ephemeral disk). Rate-limit `global/auth/order` in-process.

### VII. Input Validation
Validate and sanitize user-controlled input at trust boundaries
(`validators/`, mass-assignment safe). Do not rely only on frontend
validation. Reject unknown fields on sensitive writes; fail closed.

### VIII. Authentication and Authorization
AuthN/authZ MUST stay explicit and consistent. Hiding a frontend element
MUST never be treated as protection. Admin operations MUST require
server-checked roles on every request, not just on page render.

### IX. Database Safety
No destructive DB changes without explicit justification. Preserve existing
data. Prefer backward-compatible migrations with safe defaults; migrations
in `database/migrations/*.sql` MUST be idempotent via `migrate.js` +
`schema_migrations`. Money in cents; snapshot prices at purchase.

### X. Error Handling
Do not silently swallow errors. Log appropriately; users get useful safe
messages. The error envelope MUST hide internals in prod. No secrets,
tokens, or stack traces to clients.

### XI. Async and Concurrency Safety
Code MUST stay correct under concurrent orders and edits. Avoid race
conditions, duplicate orders, inconsistent state, and unsafe shared mutable
state. Validate state transitions (availability, status, subscription)
server-side at write time, not just at render time.

### XII. Performance
Avoid unnecessary queries, repeated expensive operations, unbounded loops,
excessive payloads, and N+1 patterns. Important endpoints MUST stay usable
under significant concurrent traffic. Hero/marketing visuals MUST add zero
extra API/DB requests (inline emoji/CSS).

### XIII. Code Quality
Prefer clear, maintainable, modular code. No unnecessary duplication, giant
functions, hidden side effects, magic values, dead code, or inconsistent
patterns. Boring over clever.

### XIV. Backward Compatibility
Before changing APIs, routes, DB fields, auth behavior, or shared utils,
identify all known consumers and update them safely. Client-sent
totals/prices MUST be ignored; totals, fees, availability, hours, and
subscription gating MUST be computed server-side from DB prices (cents)
and server clock/timezone, with re-validation of `is_active`, `status`,
hours, and `subscription_ends_at` on checkout, bookings, and transitions.

### XV. Testability
Important business logic and security-sensitive behavior MUST be testable.
Add the smallest runnable check where appropriate instead of relying only
on manual browser testing.

### XVI. Observability
Important failures and operational problems MUST be diagnosable through
logging without exposing credentials, tokens, or sensitive customer data.

### XVII. Deployment Safety
The app MUST stay compatible with the actual deployment environment. Do not
introduce dependencies, services, or infra the deployment cannot support
without explicitly planning the change. Runtime: Node >= 20, Express 4,
PostgreSQL via `pg` (`DATABASE_URL` or Wasmer `DB_*`, TLS
`rejectUnauthorized:false`). Deploy: Wasmer Edge `app.yaml`
(`name:restaurants`, `fr-roub1`, `anybuild` remote, CDN 1h cache). Config
in `config/index.js` fails fast on weak prod secrets or localhost DB.

### XVIII. Do Not Overengineer
Use the simplest architecture that safely supports the current SaaS. Do not
introduce React, microservices, queues, Redis, Kubernetes, or other infra
merely because it is modern. No new dependencies, frameworks, or
single-use abstractions; no speculative features. Prefer reuse: existing
helper → stdlib → native platform → installed dep → one-liner → minimal
new code. Deletion over addition.

### XIX. Vanilla JavaScript Is Intentional
The storefront/app is vanilla HTML/CSS/JS with no build step and no
TypeScript, served by `express.static(client, {extensions:['html']})` plus
explicit `/app`, `/restaurant/:slug`, `/track`, `/resources` routes
(`site.routes.js` only for `robots.txt`/`sitemap.xml`/`/r/:slug` 301). Do
not convert to React or another framework unless explicitly requested. The
existing `frontend/` React scaffold is grandfathered; do not expand its
scope or duplicate the vanilla app into it without an explicit decision
(see XXII).

### XX. Refactor Without Destroying
Preserve behavior first, then improve structure. Refactoring MUST be
incremental and verifiable. Bug fixes MUST target the root cause in the
shared function, not per-caller patches.

### XXI. Verify Before Declaring Success
After implementation, run relevant tests, static checks, and
build/deployment checks. `npm run check` (`scripts/check-syntax.js`) MUST
pass (0 failures) before any deploy. Manual smoke: `/`, `/app/`,
`/restaurant/:slug`, `/track`, login, dashboards, pricing fetch, robots,
sitemap, 404 HTML vs JSON (`node --test tests/` needs explicit
`TEST_DATABASE_URL` on a disposable DB, never prod). Never claim
production-ready merely because code changed. No deploy without explicit
user approval.

### XXII. Document Important Architectural Decisions
When an important architectural decision is made, document the reason so
future agents do not accidentally undo it. Use `HANDOFF.md` + `README.md`
+ `a.md` as runtime guidance.

## Stack & Architecture Constraints
Vanilla HTML/CSS/JS, no build step, no TypeScript. Structure: `server/routes
→ controllers → services → parameterized SQL`, `validators/`
mass-assignment safe, `database/migrations/*.sql` idempotent. Marketing
(`/`, `/features.html`, `/pricing.html`, `/for-*.html`, `/contact.html`,
`/resources/`) MUST be static HTML with baked-in Arabic-default content
(single URL, `lang=ar dir=rtl` default; `i18n.js` enhancement only).
Private pages (`login/admin/owner/delivery/leads/track/app`) MUST carry
`noindex`. `robots.txt` allows marketing + `/restaurant/`, disallows
`/api/admin/owner/delivery/leads`. `sitemap.xml`: canonical public URLs +
active restaurants only (max 500). Skeleton loader (`skeleton.css/js`)
MUST paint first on every HTML page, hide on `load` + 3.8s fallback, with
offline retry. Owner-editable pricing via `platform_settings(id=1,
pricing_cents 899)` + public `GET /api/pricing` fallback + `PATCH
/api/owner/platform-pricing`.

## Development Workflow
TDD for non-trivial logic (branch/loop/parser/money/security) with the
smallest runnable check. `npm run check` MUST pass before deploy. Smoke
all key routes after every change. Keep changes small, isolated, and
revertable. Justify complexity with a YAGNI note.

## Governance
Constitution supersedes all other practices. Amendments require a doc
update, version bump (MAJOR breaking governance, MINOR new principle,
PATCH wording), and migration note. All PRs/reviews MUST verify I–XXII
compliance. Complexity MUST be justified.

**Version**: 1.1.0 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-09-25
