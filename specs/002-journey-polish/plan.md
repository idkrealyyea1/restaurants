# Implementation Plan: Journey Polish

**Branch**: `002-journey-polish` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

## Summary

Nav entry to `#request`, WhatsApp fast CTA + float (wa.me/972567439846 prefilled), hero inline-SVG food visuals zero-request, owner pending badge, logical CTA flow to `#request`. Reuse existing routes/services/validators/limiter; no new deps; no inline JS.

## Technical Context

Node >=20, Express 4, PG, vanilla JS. Storage: existing `restaurant_requests` (016). Testing: `npm run check` + curl smoke. Constraints: CSP `scriptSrc 'self'`, `orderLimiter` 20/h, single-URL Arabic, skeleton first paint.

## Constitution Check

- [x] I isolation: requests platform-level, owner-only read.
- [x] II server validation, no client trust.
- [x] III reuse: existing limiter/code/validators; inline SVG not new dep.
- [x] IV CSP: all JS in `site.js`/`owner.js`, no inline; wa.me external link only.
- [x] V static-first: form/hero baked HTML, zero hero fetches.

## Project Structure

`client/index.html` (nav/drawer/request/hero/final/footer/float), `client/css/marketing.css` (thumbs), `client/js/site.js` (live+form+wa prefill), `client/js/i18n.js` (navRequest), `client/js/owner.js` + `client/owner.html` (badge). Docs `specs/002-journey-polish/`.

## Complexity Tracking

None.
