# Converge: Restaurant Request Intake

**Date**: 2026-09-22 | **Result**: Converged

## Verification

- `npm run check`: 67 files, 0 failures (incl. `client/js/offer.js`, `site.js`)
- Smoke (ephemeral port, no DB):
  - `GET /` 200 Arabic + `#request-form` + `.mk-food-thumb` emoji, zero inline `<script>`
  - `GET /app/`, `/restaurant/demo`, `/api/healthz`, `/api/pricing 899` PASS
  - `POST /api/restaurant-requests {}` → 400, valid → 500 envelope (validation passed, DB down as expected)
  - `GET /api/owner/restaurant-requests` anon → 401
  - `robots.txt`/`sitemap.xml` no demo, `GET /offer/*` no inline PASS
- CSP: `scriptSrc 'self'` — no `<script>` without src in `client/**/*.html`; `onerror/onclick` removed; `offer.js` externalized with esc() + error listener.

## Fixes applied in this cycle

- `client/js/site.js`: moved hero live redirect + request submit from inline to external (C1).
- `client/index.html`: removed 2 inline blocks, keeps 5 `src` scripts only.
- `client/js/offer.js` (new): externalized offer fetch + esc + img error handler; `client/offer.html` now `api.js + offer.js + skeleton.js`.
- `client/offers.html`: removed redundant inline redirect (meta refresh already covers).

## Remaining work

None. No new tasks. Ready for user-approved deploy only (hold per FR-008).
