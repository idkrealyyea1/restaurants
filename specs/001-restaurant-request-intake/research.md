# Research: Restaurant Request Intake

**Date**: 2026-09-22 | **Feature**: 001-restaurant-request-intake

## Decision: Reuse `orderLimiter` for public POST anti-spam
- **Rationale**: Already tuned 20/hour/IP for orders/bookings, in-process, no new store. Sufficient for lead form v1, no CAPTCHA needed.
- **Alternatives considered**: New dedicated limiter (rejected: extra config, same semantics); CAPTCHA (rejected: friction, new dep, Arabic UX cost).

## Decision: Single `restaurant_requests` table, no FK to `restaurants`
- **Rationale**: Leads are pre-tenant; owner manually converts to `restaurants` via existing `POST /api/owner/restaurants`. FK would force premature tenant creation. Unique `code` via existing `orderCode()` (6-12 alnum) for phone reference.
- **Alternatives considered**: Reuse `leads` table (rejected: different pipeline, JSONB-heavy, sales-agent specific); direct `restaurants` creation on submit (rejected: spam tenants, subscription bypass).

## Decision: Owner-only inbox, no staff access
- **Rationale**: `requireOwner` matches pricing sensitivity; staff already blocked from deletes. Keeps PII (phones) minimal exposure. Matches `platform-pricing` precedent.
- **Alternatives considered**: `requireOwnerOrStaff` (rejected: widens PII access, no need).

## Decision: Hero thumbs as inline emoji + CSS (`.mk-food-thumb`)
- **Rationale**: Zero HTTP, zero DB, paints with HTML, RTL-safe, 54px grid. Prior `<img src="/images/logo-placeholder.svg">` cost 4 requests for identical placeholder. Emoji renders on all phones, no font load.
- **Alternatives considered**: WebP food photos (rejected: new assets, cache, requests, violates "appears easily"); keep placeholder SVG (rejected: 4 fetches, grey, unappetizing).

## Decision: Form JS externalized (CSP compliance)
- **Rationale**: `helmet` `scriptSrc 'self'` forbids inline scripts. Existing pages use `<script src="/js/site.js">`. Current `index.html` has two small inline `<script>` blocks (live redirect + request submit) that violate CSP in prod (blocked). Must move to `site.js`.
- **Alternatives considered**: Loosen CSP to `unsafe-inline` (rejected: weakens XSS defense, violates constitution IV).
