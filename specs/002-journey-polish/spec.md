# Feature Specification: Journey Polish

**Feature Branch**: `002-journey-polish`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Check words and logic in front of user, entry from main menu to own-page form sent to admin where owner sees orders/requests then contacts and applies it, add WhatsApp fast response, make main-page phone contain real-looking images with zero extra requests, make journey logical, then deploy."

## User Scenarios & Testing

### User Story 1 - Request own page from main menu (Priority: P1)

Visitor clicks اطلب صفحتك in nav/drawer/pricing/final CTA, smooth-scrolls to `#request`, fills Arabic form, submits, sees code + WhatsApp fast option.

**Why this priority**: Core conversion entry; currently nav lacks request link so form is undiscoverable.

**Independent Test**: Click nav اطلب صفحتك → lands on `#request`; submit valid → 201 + code; submit empty → inline error.

**Acceptance Scenarios**:

1. **Given** on `/`, **When** clicking nav/drawer اطلب صفحتك, **Then** scrolls to request form.
2. **Given** valid inputs, **When** submitting, **Then** 201 with code + success + toast within 3s.
3. **Given** no DB, **When** submitting valid, **Then** friendly Arabic error + retry, no silent loss.

---

### User Story 2 - WhatsApp fast response (Priority: P1)

Visitor in request section clicks WhatsApp button → opens `wa.me/972567439846` with prefilled Arabic message including typed name/restaurant.

**Why this priority**: Requested explicitly; fastest contact for hesitant users.

**Independent Test**: Click WhatsApp CTA → new tab `wa.me` with encoded text; works without JS fetch.

**Acceptance Scenarios**:

1. **Given** on `#request`, **When** clicking WhatsApp, **Then** opens wa.me with prefilled text.
2. **Given** floating button visible, **When** clicking, **Then** same wa.me opens from any scroll position.

---

### User Story 3 - Real-looking phone (Priority: P2)

Visitor sees hero phone with 4 realistic food visuals, zero extra HTTP/DB.

**Why this priority**: Trust; emoji alone looks mock. Must stay zero-request.

**Independent Test**: Load `/` throttled → 4 food visuals paint with HTML, DevTools Network shows 0 hero `/api`/`/uploads`/image fetches.

**Acceptance Scenarios**:

1. **Given** 2G, **When** loading `/`, **Then** food visuals render with HTML/CSS inline SVG, no broken icons.
2. **Given** `prefers-reduced-motion`, **When** loading, **Then** static visuals still clear.

---

### User Story 4 - Owner triage then apply (Priority: P2)

Owner opens `/owner.html` requests inbox, sees pending count, filters, contacts via WhatsApp, approves, manually creates restaurant via existing flow.

**Why this priority**: Closes loop; owner must act in one place.

**Independent Test**: Owner login → inbox shows table + pending badge; status change persists; WhatsApp link opens.

**Acceptance Scenarios**:

1. **Given** 2 pending, **When** opening owner panel, **Then** header shows count + table rows.
2. **Given** non-owner, **When** calling API, **Then** 401/403.

---

### Edge Cases

- Empty nav on mobile → drawer contains اطلب صفحتك + WhatsApp.
- Invalid phones → 400, no row, Arabic field error.
- DB down → 500 envelope, form shows retry, WhatsApp still works (no DB needed).
- No live restaurants → hero live button falls back to `/app/`.

## Requirements

### Functional Requirements

- **FR-001**: Nav + drawer + pricing + final CTA MUST link to `#request` with label اطلب صفحتك.
- **FR-002**: Request section MUST include WhatsApp CTA (`https://wa.me/972567439846?text=...` prefilled, target blank) + floating WhatsApp button site-wide (pure HTML/CSS).
- **FR-003**: Hero phone MUST show 4 realistic inline-SVG food visuals (burger/pizza/dessert/drink), zero `<img src>` fetches for hero, RTL-safe.
- **FR-004**: Words MUST be clear Arabic (no vague SaaS), consistent verbs (شاهد/اطلب/شارك/استلم), single URL, `data-i18n` for toggle.
- **FR-005**: Owner inbox MUST show pending count badge, filter, status select, wa.me link, delete, notes; `requireOwner` only.
- **FR-006**: Journey MUST be logical: hero live → trust → live → problem → how → features → showcase → industries → pricing→request → FAQ → final CTA→request.
- **FR-007**: Preserve CSP `scriptSrc 'self'` (no inline JS), skeleton, SEO, `/api/*` compat.
- **FR-008**: Deploy via `wasmer deploy --build-remote` only after all smoke PASS.

### Key Entities

- **RestaurantRequest**: code, customer_name, restaurant_name, phone, whatsapp, city, notes, status, created_at (existing 016).
- **Visitor**: anonymous, Arabic-first, mobile.
- **PlatformOwner**: triages via `/owner.html`, contacts via WhatsApp, creates tenant manually.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Visitor reaches form in 1 click from nav and submits in <90s, 90% first-attempt success.
- **SC-002**: WhatsApp CTA opens prefilled chat in <1s with no fetch.
- **SC-003**: Hero paints 4 food visuals with 0 extra requests on 2G.
- **SC-004**: Owner finds new request in <5s and updates status without reload.

## Assumptions

- Owner WhatsApp `+972567439846` (existing sales number) is fast-response channel.
- Inline SVG + CSS is sufficient realism; no photo assets for v1.
- Auto-provisioning from approved → restaurant out of scope; manual creation via existing modal.
