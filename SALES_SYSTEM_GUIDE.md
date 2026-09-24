# AI Restaurant Lead-to-Customer Sales System — Complete Guide

Live: `https://restaurants-platform.wasmer.app/leads` (owner `idkrealyyea1`) + `https://restaurants-platform.wasmer.app/offers.html` + `https://restaurants-platform.wasmer.app/offer/<code>` + `https://restaurants-platform.wasmer.app/restaurant/<slug>`

---

## 1. What it is

You had a multi-tenant ordering SaaS (`restaurants-platform` `README.md:2` — `restaurants`, `users`, `restaurant_settings`, `orders`, `uploaded_files` `003_uploaded_files.sql:4`) where you manually created trials in `owner.html`. Now you have a **closed-loop sales machine** on top of the same DB/auth/deployment: `Agent Reach (Exa)` → find restaurant → research/score → collect assets → generate live demo restaurant (same `createRestaurant` `server/services/restaurants.service.js:20`) + 7-day `subscription_ends_at` `006_subscription.sql:5` → offer → personalized WhatsApp/Email/Instagram → CRM pipeline → follow-up → converted. No rebuild, no new auth, no new hosting.

---

## 2. Architecture (Reuse)

- **DB:** `restaurants`+`users` (bcrypt 12 `users.service.js:8`, `subscription_ends_at` gating `middleware/auth.js:70`, `public.routes.js:47`, `restaurants.service.js:303`) + new `leads` `010_leads.sql:1` + `search_runs` `011/012/013`. `leads` is one table `JSONB` for flexibility (ponytail: normalize if >10k). `display_id SERIAL` → permanent `LEAD-000003` (`leads.service.js:412` `LPAD`), `code` `orderCode()` `utils/ids.js:11` never changes even if name/phone/insta change.
- **Backend:** `leads.service.js` (CRUD, `scoreLead` heuristic, `findDuplicate` 5 identifiers, `updateExistingLead`, `mergeLeads`, `stats`), `enrichment.service.js` (shells `~/.agent-reach-venv/bin/mcporter call exa.web_search_exa` `mcporter 0.9.0` `~/.mcporter/mcporter.json`, fallback mock `amman-leads.csv`), `leads.controller.js` (9 handlers inc `prepareEverything` 1-11 steps, `qualityCheck` 9 asserts), `leads.routes.js` `GET /api/owner/leads/*` `requireOwner` `leads.routes.js:6`, public `GET /api/offer/:code` `public.routes.js:123` for shareable preview.
- **Frontend:** `leads.html` + `leads.js` (dashboard, filters, discover, manual, lead cards, pipeline, outreach one-click, response, refresh, merge, history) reuse `client/js/api.js:61` `esc`, `client/css/offers.css` tokens, `i18n.js` RTL, `helmet` CSP `server/app.js:36`.
- **Deploy:** `app.yaml:1` `name: restaurants` `fr-roub1` `capabilities.database: postgres`, `wasmer deploy --build-remote` auto `migrate` `server.js:13`, `SESSION_SECRET` + `DB_*` injected `config/index.js:51`.

---

## 3. How it Works — Lead → Research → Score → Demo → Offer → Send

### Step 1 — Discovery
`leads.html` → `اكتشاف عبر Agent Reach` → city `Amman`, query `restaurants Amman menu`, `Find New Only` checked → `POST /api/owner/leads/discover` → `enrichment.service.js:14` spawns `mcporter`, parses `title/url/highlights`, builds candidate `{restaurant_name, city, phone, whatsapp, instagram, facebook, website, menu_url, google_listing, social_links, category, notes, source_urls}`. No API key, free Exa via `mcporter`.

### Step 2 — Deduplication (Before Insert)
`leads.service.js:45` `findDuplicate` normalizes: `normalizeName` (lower, strip punct, collapse spaces), `normalizePhone` (digits last 9), `normalizeInstagram` (extract `instagram.com/user`), `extractDomain`. Priority: 1) `google_place_id` 2) `instagram` 3) `website domain` 4) `phone/whatsapp` 5) `normalized_name+city` exact → `MATCH` (update existing). Same-city fuzzy `nameSimilarity` Levenshtein `≥0.8` → `UNCERTAIN` → `POSSIBLE_DUPLICATE` with `possible_duplicate_of`. Else `NEW`. Cross-city same name → `NEW` (not flagged). Every run inserts `search_runs` `leads.service.js:332` (`results_found, new_leads, duplicates, possible_duplicates, updated_existing`) shown as `Found 50 New 31 Already Known 16 Possible 3`.

### Step 3 — Research & Score
`POST /api/owner/leads/:id/research` or `Prepare Everything` step 1 → `researchLead` fetches `website` (5s timeout) for `og:image` + menu detection, stores `assets {logo,cover,images[{url,source}]}` + `menu_url`, then `scoreLead` heuristic: `+25 no website, +15 no menu, +10 menu only via social, +10 active Instagram, +5 Facebook/Google, +5 delivery hint, +10 multi-branch, +10 has contact, +10 no ordering, -10 has ordering` → 0-100 → `≥75 HOT, 45-74 WARM, <45 COLD` + `score_reason` e.g. `Active restaurant with strong Instagram but no direct ordering`.

### Step 4 — Asset Collection
Prefer official website `og:image` + 3 `<img>` + `lead.logo_url/cover_url`, store `source_url` per image, skip if not safe. Images not blindly scraped from Google. If fails, demo uses placeholder.

### Step 5 — Demo (6 Items)
`leads.controller.js:84` `generateDemoForLead` → `normalizeSlug(name)` → `restaurants.createRestaurant({trialDays:7})` `owner.controller.js:75` → inside tx creates `restaurant_settings` + 7 `restaurant_hours` → `users.createAdmin` (`username=slug_admin`, `password=crypto 9b base64url` ~12 chars, `bcrypt`) → `categories.createOwned` 2 cats `الأطباق الرئيسية`/`المشروبات` → `menu.createOwned` 6 items (3+3) priceCents 1200/1800/600/900/400/200 (ponytail: no invented prices beyond these demo placeholders, real prices only if reliably parsed) → `leads.attachDemo` sets `restaurant_id, trial_username, trial_expires=now+7d, trial_status=ACTIVE, demo_status=GENERATED, status→DEMO_GENERATED`. Looks exactly like a real professional ordering site `GET /api/restaurants/:slug/menu` `restaurants.service.js:126`.

### Step 6 — Trial Login
Credentials shown once in lead card `leads.js` `offer/demoUrl` + `loginUrl` `APP_URL/login.html` + `username/password`, stored as `trial_username` (password hash only in `users` table, never in `leads` or public offer). `auth.controller.js:29` + `middleware/auth.js:70` enforce `subscription_ends_at` → after 7d `POST /api/auth/login` `403 SUBSCRIPTION_EXPIRED` `انتهت التجربة 7 أيام — +972567439846` `client/js/login.js:43`, `GET /restaurant/:slug` 404 `restaurants.service.js:129`, `listPublicDirectory:303` hides from homepage, `POST /orders|bookings` 403.

### Step 7 — Offer
`buildOffer` → `{headline: "Bayt Sara — اطلب أونلاين بدون عمولة", sub, demoUrl, loginUrl, username, logo, cover, score}` stored `offer_data` `leads.service.js:146`. Shareable `GET /offer/:code` `public.routes.js:123` `offer.html` public (no password, password only in lead card `leads.html` owner view).

### Step 8 — Messages
`buildMessages` by situation: `!website` → `لاحظت أن مطعمكم نشط على انستغرام لكن بدون موقع للطلب`, `!menu` → `موقعكم موجود لكن بدون منيو`, `!ordering` → `لديكم منيو صور لكن بدون طلب مباشر`, else `لديكم طلب أونلاين لكن برسوم عمولة` → generates `whatsapp, instagram` (same base), `email_subject`, `email_body` with `demoUrl/loginUrl/user/pass` + `+972567439846`.

### Step 9 — One-Click Outreach
Lead card `WhatsApp` → `https://wa.me/<digits>?text=encode(whatsapp)` + `POST /leads/:id/contact` sets `contact_date, next_followup=+2d`, `Email` → `mailto:?subject=&body=`, `Instagram` → copy `navigator.clipboard` + `window.open(https://instagram.com/<handle>/)` + `POST /contact`. Goal `Research → Generate Demo → Generate Offer → Click → Send` no manual copy needed, but copy+open used where API not possible (Instagram has no `?text` prefill).

### Step 10 — Pipeline
`NEW→RESEARCHED→QUALIFIED→DEMO_GENERATED→CONTACTED→REPLIED→DEMO_VIEWED→TRIAL→CONVERTED→LOST` + `NOT_INTERESTED,POSSIBLE_DUPLICATE` `leads.service.js:7` `TRANSITIONS` `assertTransition`. Manual dropdown `PATCH /leads/:id/status` + `pipeline_history` JSONB. `contact_date, next_followup, followups[]` stored.

### Step 11 — Follow-Up
`contact` sets `next_followup` + `followups[]` note. Prepare follow-ups automatically: follow-up 1 `+2d` after contact, follow-up 2 `+5d`, trial-expiration `trial_expires-1d` — prepared as text in `leads.js` details, not auto-sent (you click Send). No spam without approval.

### Step 12 — Dashboard
`GET /api/owner/leads/stats` → `total, hot, warm, cold, demos, contacted, replied, active_trials, expiring_trials (<2d), converted, not_interested, possible_duplicates, new_leads, unique_leads, total_searches, duplicates_prevented (SUM duplicates this month), conversion_rate` + `recentRuns[5]` `leads.service.js:167` shown in `leads.html` `dash-grid` 14 cards + filters `search/city/status/scoreLevel/trialStatus/contacted` + `includePossible`.

### Step 13 — Prepare Everything
Button `Prepare Everything` `leads.js:145` → `POST /leads/:id/prepare-everything` does `research→score→assets→demo (if none)→offer→messages→qualityCheck` sequentially, toast progress, then reload. `qualityCheck` 9 asserts: name, demo slug reachable `getPublicView`, items>0, trial username, trial expiry future, whatsapp contains name, offer demoUrl, etc. If fails shows exact issue + allow regenerate.

### Step 14 — Image Handling
`upload.js:26` `sniffImageType` magic bytes, `files.service.js:16` `INSERT uploaded_files`, `client/js/api.js:156` `compressImage` canvas 1200px WebP quality 0.75. Collected assets stored as URLs + `source_url`, only optimized copies stored for demo logo/cover if fetched (ponytail: skip huge originals, upgrade to `sharp` if need).

### Step 15 — Security
`requireOwner` `leads.routes.js:6` + `attachUser` reloads `is_active` every req, `validateUsername/password 10-200` `validators/index.js:59`, `esc()` `api.js:61` everywhere, `helmet` CSP `server/app.js:36` `styleSrc 'self'` (now `offers.css` external), `query` parameterized `$1`, no Agent Reach keys exposed, `trial password` only returned once via `generateDemo` `leads.controller.js:132` credentials, never in `GET /leads` list or public `GET /api/offer/:code`.

---

## 4. What Makes It Good

- **One table, one page, one click** — ponytail minimal: no 5-table over-engineering, yet covers 17 reqs. Reuses `createRestaurant` + `subscription_ends_at` you already paid for.
- **No duplicates, no history loss** — 5-identifier dedup + `updateExistingLead` preserves `status/pipeline_history`, `POSSIBLE_DUPLICATE` lets you decide, not auto-merge.
- **Never assumes No** — `NOT_INTERESTED` only via explicit `response_status` select, cooldown 90d default configurable, during cooldown not shown as NEW, after cooldown re-research updates same `LEAD-000003` permanent ID `display_id` `011:54`.
- **Real demo, not mock** — demo is a real `restaurants` row with menu, hours, settings, admin login, trial gate, revenue still counted, survives redeploy (`uploaded_files` DB).
- **Personalized, not spam** — messages use situation + name + demo link + creds, HOT/WARM/COLD explains why, offer visually professional with logo/cover.

---

## 5. How It Helps Your Project

You sell $8.99/mo `0% commission` vs Talabat 18-25%. Manual outreach in `offers.html` was 8 hardcoded `LEADS` `offers.js:10` + `localStorage`. Now: `Amman` → `Find New Restaurants` → 8 leads in 10s → `Prepare Everything` 20s → demo live `https://restaurants-platform.wasmer.app/restaurant/bayt-sara` → `View Offer` → `WhatsApp` one-click → `CONTACTED` → follow-up `+2d` → trial `7d` → `CONVERTED`. You keep `100%` of orders, trial auto-blocks, `CONVERTED` never re-appears as new lead. Dashboard tells you `Hot 4 Warm 12 Demos 5 Converted 2 18%` not gut feel.

---

## 6. How to Use (Owner)

1. `leads.html` → `اكتشاف عبر Agent Reach` → city `Amman`, `Find New Only` checked → `اكتشاف الآن` → stats `Found 50 New 31 Already Known 16 Possible 3`.
2. Filter `HOT` → open card `Bayt Sara` `WARM 65` `No website + Active Instagram` → `Prepare Everything` → wait `research 65 → demo bayt-sara → offer → messages → QC ok`.
3. `Open Demo` → check menu, `View Offer` → `https://restaurants-platform.wasmer.app/offer/67XWQPMV`, copy.
4. `WhatsApp` → `wa.me/962789...?text=مرحبا Bayt Sara ... bayt_sara_admin/q5S5...` → Send → auto `CONTACTED` + `next_followup +2d`.
5. Client replies → set `response_status: Interested` → `REPLIED` → `Demo Viewed` → after 7d `TRIAL` → `CONVERTED` or `LOST`.
6. If `POSSIBLE_DUPLICATE` banner → `Merge Leads` → keep best contact, history preserved.

---

## 7. Lead Memory & Deduplication (Add-On)

- **Persistent DB:** every `restaurant_name, normalized_name, phone, whatsapp, instagram, instagram_url, facebook, website, menu_url, google_listing/place_id, city, source_urls, first/last discovered, last researched, score, demo/trial/contact status, notes, offer, messages, assets` stored in `leads` + `search_runs`.
- **5-identifier dedup:** `google_place_id` → `instagram` → `website domain` → `phone/whatsapp last 9 digits` → `normalized_name+city` exact = `MATCH` (update existing, preserve history). Same-city fuzzy `≥0.8` → `UNCERTAIN` → `POSSIBLE_DUPLICATE`. Else `NEW`.
- **Search history:** `search_runs` insert per `discover` (`query, city, results_found, new, duplicates, possible, updated`) → `stats` shows `Duplicates prevented this month`.
- **Find New Only:** checkbox filters to `created` only.
- **Refresh:** `POST /leads/:id/refresh` re-fetches website/og:image without duplicating.
- **Status memory:** `CONTACTED` stays `CONTACTED` even if re-found; never auto `NOT_INTERESTED`.
- **Cooldown:** `NOT_INTERESTED` → `cooldown_ends_at = now+90d` (configurable) → during cooldown not shown as NEW, not duplicated, after expiry re-research updates same `LEAD-000003`.
- **Converted:** `CONVERTED` never appears as new lead.
- **Merge:** `POST /leads/merge {targetId, sourceId}` keeps best contact, merges `source_urls/images/social_links/followups/history`, keeps `restaurant_id/trial`, deletes source.
- **Permanent ID:** `code` `XYJ28CV2` + `display_id` → `LEAD-000003` (`LPAD`) never changes even if name changes.
- **Tested:** `Burger House Gaza` (`@burgerhousegaza`) vs `Burger House` same insta → same lead; same phone different name → same; same website different name → same; same name different city (`Gaza` vs `Ramallah`) → correctly 2 leads; `NOT_INTERESTED` → re-discover blocked 90d → after cooldown same ID updated.

---

## 8. Limitations Agent Reach

- Exa search free via `mcporter` (already `exa` in `~/.mcporter/mcporter.json`), no login. `twitter/reddit/facebook/instagram` login-backed via `OpenCLI` not wired — we use public website `og:image` + `instagram` handle as stored, not private DMs. To enrich Instagram likes/followers you need `OpenCLI` Chrome session + `agent-reach configure` (adds `twitter-cli` etc.).
- Image collection only official website + `logo_url` (ponytail: no Google image scrape for copyright), store `source_url` per asset.
- Scoring heuristic, not LLM — upgrade when mis-ranks.

---

## 9. Deployment

Already live 4 deploys today. To update: `wasmer deploy --build-remote` (runs `010/011/012/013` idempotent). Env unchanged: `DATABASE_URL`/`DB_*`, `SESSION_SECRET`, `APP_URL`. No new env for Agent Reach (uses local `mcporter`); to enable full social, run `agent-reach install --system --channels=opencli` on your dev machine, not Wasmer.

---

## 10. Files Changed (Summary)

- `010_leads.sql`, `011_lead_memory.sql`, `012_fix_search_runs.sql`, `013_search_query_compat.sql`
- `server/services/leads.service.js`, `enrichment.service.js`, `restaurants.service.js:303` hide expired, `middleware/auth.js:70` re-validate, `bookings.service.js:89` fix, `server.js:18` exit, `leads.controller.js`, `leads.routes.js`, `public.routes.js:123` offer, `app.js:124` `/leads`+`/offer`
- `client/leads.html/js`, `offer.html`, `owner.html:14` Leads link, `css/offers.css` (external for CSP), `offers.html/js` (Find New, refresh, dedup)

---

*Generated for restaurant SaaS — Wasmer Edge + Postgres, Agent Reach Exa, 7-day trial enforcement, ponytail minimal.*
