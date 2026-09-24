# Feature Specification: Restaurant Request Intake

**Feature Branch**: `001-restaurant-request-intake`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "When someone wants to get a restaurant and buy, show a form on the main page where he fills his info to ask for his own page, owner sees these requests from admin (owner) panel and manages them. Main page phone visual must use lightweight images that render easily without extra server requests. Do not deploy until everything is finished."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit restaurant page request (Priority: P1)

Arabic-speaking visitor on `/` scrolls to request section, fills name, restaurant name, phone, WhatsApp, city, notes, submits, sees success with tracking code.

**Why this priority**: Core conversion — turns marketing visit into qualified lead without account or WhatsApp DM. Directly requested.

**Independent Test**: Can be fully tested by opening `/`, submitting valid form via `POST /api/restaurant-requests`, asserting 201 + code, and seeing row in owner inbox. Delivers lead capture even if hero visuals unfinished.

**Acceptance Scenarios**:

1. **Given** visitor on `/` with valid Arabic inputs, **When** submitting request form, **Then** system creates pending request and shows success with code within 3s.
2. **Given** missing required fields, **When** submitting, **Then** inline error shows and no request is created.
3. **Given** invalid phone format, **When** submitting, **Then** server returns 400 with field error and no row is stored.

---

### User Story 2 - Owner triages requests (Priority: P2)

Platform owner on `/owner.html` opens Restaurant Requests card, filters by status, changes status, opens WhatsApp chat, deletes spam.

**Why this priority**: Closes loop — owner must see and act without leaving dashboard. Without it P1 leads pile up unseen.

**Independent Test**: Can be fully tested by logging in as owner, calling `GET /api/owner/restaurant-requests`, changing status via PATCH, deleting via DELETE. Delivers inbox management independent of marketing copy.

**Acceptance Scenarios**:

1. **Given** owner logged in with 2 pending requests, **When** opening owner panel, **Then** requests list shows code, customer, restaurant, phones, status, date.
2. **Given** owner changes status to contacted, **When** PATCH succeeds, **Then** badge updates without full page reload.
3. **Given** non-owner (admin/delivery/anon), **When** calling owner requests API, **Then** 401/403 and no data leaks.

---

### User Story 3 - Lightweight hero visuals (Priority: P3)

Visitor on `/` sees phone mock with appetizing food visuals that paint instantly on 2G without extra fetches.

**Why this priority**: Supports conversion (people see product) but must not regress performance. Lower than functional intake.

**Independent Test**: Can be fully tested by loading `/` with network throttling, asserting hero shows 4 food rows, zero `/api` or `/uploads` requests for hero, first paint <1s on cached shell.

**Acceptance Scenarios**:

1. **Given** slow 2G, **When** loading `/`, **Then** hero food thumbs render with page HTML (no async fetch) and skeleton hides correctly.
2. **Given** offline after first visit, **When** reloading `/`, **Then** cached shell + skeleton show, no broken image icons.

---

### Edge Cases

- What happens when DB unreachable on submit? Public API returns 500 envelope, form shows friendly Arabic error, no silent loss (user can retry).
- How does system handle duplicate/spam submits? Rate-limited (`orderLimiter` 20/hour/IP), each submit creates separate row with unique code; owner deletes spam.
- What happens when WhatsApp number has spaces/dashes? Normalized server-side via `cleanPhone`, stored digits+plus only.
- What happens when owner filters unknown status? Ignored (treated as no filter), returns all.
- How does hero behave with `prefers-reduced-motion`? Shimmer/animations disabled, static thumbs still visible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide Arabic request form on `/` with fields customerName (2-80), restaurantName (2-80), phone (required), whatsapp (required), city (0-60), notes (0-500).
- **FR-002**: System MUST validate request server-side via `validateRestaurantRequest` and reject invalid with 400 + field errors, creating no row.
- **FR-003**: System MUST persist valid request to `restaurant_requests` with unique 6-12 alnum code, status `pending`, timestamps, via `POST /api/restaurant-requests` (public, rate-limited).
- **FR-004**: System MUST expose owner-only `GET /api/owner/restaurant-requests` with pagination (limit/offset) and status filter, `PATCH /:id` for status (pending/contacted/approved/rejected), `DELETE /:id`.
- **FR-005**: Owner panel MUST show requests card with filter, refresh, pagination, status select, WhatsApp deep link (`wa.me/<digits>`), delete with confirm, notes preview.
- **FR-006**: Hero phone MUST render 4 food rows with inline visuals (emoji/CSS, zero `/api` + zero `/uploads` fetches) and remain readable in RTL.
- **FR-007**: System MUST preserve existing `/api/*`, auth, dashboards, `/restaurant/:slug`, `/app/`, skeleton, SEO (title/meta/canonical/OG), and single-URL Arabic default.
- **FR-008**: System MUST NOT deploy (no `wasmer deploy`) until user explicitly approves; verification is local only.

### Key Entities

- **RestaurantRequest**: Represents a buy-intent lead; attributes code (unique), customer_name, restaurant_name, phone, whatsapp, city, notes, status (pending→contacted→approved/rejected), created_at. Relates to none (standalone, future manual conversion to `restaurants` row by owner).
- **PlatformOwner**: Sees and triages requests; authenticated via session, role `owner` only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors complete request form in under 90 seconds with 90% first-attempt success on valid inputs.
- **SC-002**: Owner finds new request in inbox within 5 seconds of page load (10-row page, no full reload for status change).
- **SC-003**: Homepage hero paints with food visuals on 2G without extra data fetches (0 hero API calls, HTML <30KB for hero section).
- **SC-004**: Invalid submissions show actionable error in under 1 second with no row created (100% validation coverage).

## Assumptions

- Visitors have basic Arabic literacy and a phone with WhatsApp; no account needed.
- Owner uses `/owner.html` on desktop or mobile with owner role session.
- Existing `orderLimiter` (20/hour) is sufficient anti-spam; no CAPTCHA for v1.
- `restaurant_requests` is standalone; auto-provisioning of `restaurants` from approved requests is out of scope.
- DB migration `016_restaurant_requests.sql` applies idempotently; prod migrate runs on boot.
