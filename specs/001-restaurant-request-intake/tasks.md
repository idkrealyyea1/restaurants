# Tasks: Restaurant Request Intake

**Input**: Design documents from `/specs/001-restaurant-request-intake/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verification, no new infra

- [ ] T001 Verify `npm run check` passes and app boots on ephemeral port in `server/app.js`
- [ ] T002 [P] Verify `database/migrate.js` lists `016_restaurant_requests.sql` in order

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migration + shared validation/service must exist before stories

- [ ] T003 Apply `database/migrations/016_restaurant_requests.sql` table + indexes + trigger
- [ ] T004 Implement `server/validators/index.js` `validateRestaurantRequest` with requireText/cleanPhone/cleanText bounds
- [ ] T005 Implement `server/services/restaurantRequests.service.js` create/list/setStatus/remove with `orderCode()` retry

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Submit restaurant page request (Priority: P1) 🎯 MVP

**Goal**: Arabic form on `/` creates pending request with code

**Independent Test**: POST empty → 400, POST valid → 201 + code (with DB); `/` has `#request-form`, submit empty → inline error

- [ ] T006 [P] [US1] Implement `POST /api/restaurant-requests` in `server/routes/public.routes.js` with `orderLimiter`
- [ ] T007 [US1] Implement Arabic `#request` form in `client/index.html` with 6 fields + `#rq-msg` status
- [ ] T008 [US1] Implement submit handler in `client/js/site.js` (external, CSP-safe) with fetch + toast in `client/js/site.js`
- [ ] T009 [US1] Style form via `.mk-request` in `client/css/marketing.css`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Owner triages requests (Priority: P2)

**Goal**: Owner inbox on `/owner.html` with filter/status/WhatsApp/delete

**Independent Test**: Anon GET → 401; owner GET/PATCH/DELETE work; panel shows table

- [ ] T010 [P] [US2] Implement `GET/PATCH/DELETE /api/owner/restaurant-requests` in `server/routes/owner.routes.js` with `requireOwner`
- [ ] T011 [P] [US2] Implement `listRestaurantRequests/updateRestaurantRequestStatus/deleteRestaurantRequest` in `server/controllers/owner.controller.js`
- [ ] T012 [US2] Implement `#requests-card` + `#requests-zone` table in `client/owner.html`
- [ ] T013 [US2] Implement `loadRequests()` with filter/pagination/status/wa.me/delete in `client/js/owner.js`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Lightweight hero visuals (Priority: P3)

**Goal**: Hero phone shows appetizing thumbs with zero extra requests

**Independent Test**: `/` hero has 4 `.mk-food-thumb` emoji, no hero `/api`/`/uploads` fetch

- [ ] T014 [P] [US3] Replace hero `<img>` with `.mk-food-thumb` emoji divs in `client/index.html`
- [ ] T015 [US3] Add `.mk-food-thumb` CSS in `client/css/marketing.css`

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: CSP, SEO, skeleton, syntax

- [ ] T016 Move inline `<script>` blocks from `client/index.html` to `client/js/site.js` for CSP `scriptSrc 'self'` compliance
- [ ] T017 [P] Verify `robots.txt`/`sitemap.xml` exclude demo, include `/app/` + active restaurants in `server/routes/site.routes.js`
- [ ] T018 [P] Verify skeleton `#app-skeleton` on all HTML + `npm run check` 0 failures + smoke `/`, `/app/`, `/api/pricing`, owner 401
- [ ] T019 Run `quickstart.md` validation

## Dependencies & Execution Order

- Setup → Foundational → US1 (MVP) → US2 → US3 → Polish
- US1, US2, US3 depend on Foundational; otherwise independent
- T016 blocks deploy (CSP); T018 blocks converge

## Parallel Example: User Story 1

```bash
# US1 files differ, can parallelize T006 (routes) + T009 (css) after T004/T005
Task: "Implement POST /api/restaurant-requests in server/routes/public.routes.js"
Task: "Style form via .mk-request in client/css/marketing.css"
```

## Implementation Strategy

MVP First: Setup + Foundational + US1 → validate → then US2 → US3 → Polish. No deploy until user approves.
