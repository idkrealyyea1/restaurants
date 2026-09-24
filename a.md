# Restivo — What Was Built & How The Website Works (Step-by-Step)

> Generated for `idkrealyyea/restaurants` — this file documents **every single thing** changed, kept, and how the site appears and works from first paint to conversion.

---

## 0) TL;DR — Deliverables

- **Brand** renamed from `منصة المطاعم / Restaurants Platform` → **Restivo** everywhere.
- **Pricing** is now **$8.99/month** (default) and **editable from owner panel `/owner.html`** without redeploy.
- **Root `/` is now a premium marketing homepage**, old restaurant directory moved to **`/app`** (`/app/`).
- **Static demo at `/demo.html`** — zero `/api` calls, uses existing `/images/logo-placeholder.svg`, instant paint.
- **8 SEO marketing pages** + 4 industry pages + contact + resources skeleton + 404, all with unique titles/meta/OG/canonical.
- **Skeleton loader** on **every HTML page** — shows instantly on slow/offline until real content paints, with retry.
- **`robots.txt` + `sitemap.xml` (dynamic)** + **JSON-LD** (`Organization`, `SoftwareApplication`, `Breadcrumb` where relevant).
- **Single-URL i18n** (`ar` default, `en` toggle via `localStorage`, no `/en` + `/ar` split, per your request).
- **No backend rewrite** — all existing `/api/*`, auth, dashboards, storefronts, orders, bookings, WhatsApp flows untouched.

---

## 1) Brand Rename — Restivo

**Why:** old name was long, not memorable, bad for `title` and share cards.

**Files touched:**
- `client/js/i18n.js:13` `brand: 'Restivo'` (AR) and `:378` (EN), `poweredBy` → `Powered by Restivo`, `subscriptionH` → `$8.99`, `subPrice` → `$8.99…`
- All `client/*.html` (`index.html`, `app/index.html`, `login.html`, `track.html`, `offer.html`, `leads.html`, `owner.html`, `restaurant.html`) `<title>` and brand spans.
- `client/manifest.webmanifest` `name`, `short_name`.
- `server/controllers/auth.controller.js:32`, `server/middleware/auth.js:74`, `server/services/orders.service.js:93`, `server/services/bookings.service.js:29` messages → `$8.99`.
- `client/js/login.js:46` trial message → `$8.99`.
- `client/owner.html:16` → `العروض $8.99`, `client/js/offers.js:22` price constant → `$8.99`, `leads.controller.js:349` benefits → `$8.99`.
- `outreach-templates.md`, `README.md`, `HANDOFF.md` titles.

Search: `grep -rn "Restivo" client/ server/ --include="*.html" --include="*.js"` now returns only brand, no legacy.

---

## 2) Pricing — Editable From Owner Panel (idkrealyyea1)

**Before:** `$20` hardcoded in 12+ places, require code change + deploy.

**Now:**
- **Migration** `database/migrations/015_platform_settings.sql`:
  ```sql
  CREATE TABLE platform_settings(id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
    pricing_cents int DEFAULT 899, pricing_currency text DEFAULT 'USD',
    pricing_period text DEFAULT 'month', trial_days int DEFAULT 7, brand_name text DEFAULT 'Restivo');
  INSERT INTO platform_settings VALUES(1,899,'USD','month',7,'Restivo') ON CONFLICT DO NOTHING;
  ```
- **Service** `server/services/platform.service.js`:
  - `getPricing()` → `SELECT ... WHERE id=1` with `try/catch` fallback `{899,USD,month}` so marketing never 500s when DB is down.
  - `updatePricing(patch)` whitelisted `pricingCents, pricingCurrency, pricingPeriod, trialDays, brandName`.
- **Validator** `server/validators/index.js:290` `validatePlatformPricing` (cents 0-1M, 3-letter currency, period month/year, trial 0-365, brand 1-40).
- **APIs**
  - `GET /api/pricing` public (`server/routes/public.routes.js:120`) → `{pricing}` for marketing pricing cards.
  - `GET /api/owner/platform-pricing` owner-only (`owner.routes.js:41`) + `PATCH /api/owner/platform-pricing` (owner controller `getPlatformPricing`, `updatePlatformPricing`).
- **Owner UI** `client/owner.html:24` new card `#pricing-card` with `input#pricing-price` + `select#pricing-currency` + Save. `client/js/owner.js:98` `loadPricing()` fills from `/api/owner/platform-pricing` (fallback `/api/pricing`), `PATCH` on submit, toast + reload.
- **Marketing** `client/js/site.js:13` fetches `/api/pricing`, formats via `Intl.NumberFormat` into `#mk-price` + `#mk-price-period`. `pricing.html` and homepage pricing card are live without redeploy.

**Default:** 899 cents = **$8.99/month**. Owner changes it anytime, all pages reflect within `Cache-Control: public, max-age=3600` + client fetch.

---

## 3) Homepage Split — Preserve SaaS Intact

**Before:** `GET /` → `express.static(client/index.html)` directory grid (`home.js` → `GET /api/restaurants`).

**After:**
- `client/app/index.html` is **exact copy** of old `client/index.html` (2326 bytes original, now with `noindex,follow` + skeleton). Still uses `/js/home.js` → `GET /api/restaurants`, search, card fly animation, no logic change.
- `server/app.js:67` `express.static` stays first (cookies not set for assets). New explicit routes after it:
  ```js
  app.get('/app', (req,res)=> res.sendFile(path.join(CLIENT_DIR,'app/index.html')));
  app.get('/app/', ...);
  app.get('/resources', ...); app.get('/resources/', ...);
  ```
  Static dir index would already do `/app/` → `app/index.html`, but explicit guarantees without `TRUST_PROXY` quirks. `GET /app` alone 301 via static dir redirect then serves.
- `GET /` now serves **new `client/index.html` marketing** (23KB). Old logic not deleted, just relocated.

**Preserved untouched:**
- `GET /restaurant/:slug` → `restaurant.html` (`storefront.css` + `restaurant.js` → `GET /api/restaurants/:slug/menu` + cart + `POST /api/restaurants/:slug/orders` + WhatsApp `wa.me` + bookings).
- `GET /track`, `/login.html`, `/admin.html`, `/owner.html`, `/delivery.html`, `/leads.html`, `/offer/:code`.
- All `server/routes/*` (`auth`, `public`, `admin`, `owner`, `delivery`, `leads`), `services/*`, `validators/*`, `middleware/*`.
- `server/middleware/auth.js:60` `attachUser` + `requireRestaurantAdmin` trial check (`subscription_ends_at`) still blocks expired tenants at every admin request + `POST /api/restaurants/:slug/orders` + bookings.

---

## 4) Marketing Homepage — `/` (`client/index.html`)

**Meta & SEO (in `<head>`):**
- `<title>Digital Menu & Online Ordering for Restaurants | Restivo</title>`
- `meta description: Create a digital restaurant menu, QR menu... — $8.99/month.`
- `canonical: /`, `og:type website`, `og:title`, `og:description`, `og:image /icons/icon-512.png`, `twitter:card large`, `theme-color #c73d18`, `manifest`, `icon.svg`.
- **JSON-LD** `Organization` (name Restivo, logo) + `SoftwareApplication` (BusinessApplication, offers $8.99 USD 2027-12-31, description digital menu/QR/WhatsApp).

**Nav** `.mk-nav` sticky top: left brand `R` mark + `Restivo`, center links `Features → #features`, `How it Works → #how`, `Pricing → #pricing`, `Demo → /demo.html`, right `Login → /login.html` (outline) + `Get Started → /app/` (primary) + burger `#mk-burger` for mobile (toggles `#mk-drawer`). Drawer lists all subpages + industries. Lang toggle injected by `i18n.js` into `.mk-nav-inner` before burger (`langToggle` English ↔ العربية).

**Sections in order (appearance):**
1. **Hero** `.mk-hero-grid` 2-col (stacks ≤900px):
   - Left: eyebrow `Built for restaurants…` (`heroBadge`), `h1` `Turn Your Menu Into an Online Ordering Experience` (`heroTitle`, `<em>` accent primary), lead `Give your customers…` (`heroDesc`), CTAs `Try Live Demo → /demo.html` (primary) + `See How It Works → #how` (ghost), note `No account needed…` (`heroNote`).
   - Right: `.mk-hero-visual` phone frame (260px, rounded 28px, dark notch) with 4 menu cards (Burger, Pizza, Baklava, Latte using `/images/logo-placeholder.svg`), QR card absolute top-end (88×88 checkerboard + “Scan to order” + `restivo.app/r/demo`), cart pill bottom (ink + `4 items • $34.69` + `View cart →`). All real UI pieces from `storefront.css`, no stock photo.
2. **Trust strip** `.mk-trust` 5-col (2-col ≤760px): QR Menu, Online Ordering, WhatsApp Orders, Restaurant Dashboard, Sales & Insights — simple icons, no animation.
3. **Live Demo** muted `Try it yourself`: left text + `Open Live Demo → /demo.html` + `Open real storefront → /restaurant/demo` (target blank), right preview card (badge Live preview, 4 tags).
4. **Problem → Solution** `.mk-problem` 2-col: left bullets (5 pains with ✕), right solution card (One link + QR, instant updates, no app, WhatsApp-ready).
5. **How it Works** `#how` 3-col steps `01 Create your restaurant` → `02 Share your menu` → `03 Receive orders`, plus flow `QR → Menu → Product → Cart → Order`.
6. **Features** `#features` 8 cards: Digital Menu, QR Code Menu, Online Ordering, WhatsApp Ordering, Restaurant Dashboard, Order Management, Analytics, Restaurant Customization — copy matches real capabilities from `restaurants.service`.
7. **Showcase** 2-col: left “Your customers see this” (cover gradient + chip row), right “Your team manages this” (ink window + stat grid). Below flow.
8. **Industries** 4-col (2-col ≤900px): Restaurants, Cafes, Dessert Shops, Cake Shops — gradient headers, `Explore →` links to `/for-*.html`.
9. **Pricing** `#pricing` centered card: kicker Restivo, amount `#mk-price` + `#mk-price-period`, flat fee copy, 5 bullets, `Get Your Restaurant Online → /app/` + `Try demo`, note 7-day trial editable.
10. **FAQ** 9 `<details>` (QR, phone ordering, update prices, how orders received, logo, mobile, sales, create account, try before subscribing). Last two link to demo/login.
11. **Final CTA** ink band `.mk-cta-band` (h2 + two buttons white vs outline on dark).
12. **Footer** `.mk-footer` left ©, right 6 links (Features, How it Works, Pricing, Industries, Contact, App).

**Scripts:** `i18n.js` → `api.js` → `site.js` (burger, pricing fetch, smooth scroll, `data-track` console) → `pwa.js`. All `defer`-friendly; `site.js` handles anchor smooth scroll and `fetch('/api/pricing')`.

---

## 5) Static Demo — `/demo.html` (`client/demo.html`, 15KB)

**Goal per your request:** realistic but **zero server requests**, reuses existing images, reduces load for many visitors.

- **File** `client/demo.html` standalone, includes `storefront.css` + `marketing.css` + `skeleton.css` + own inline `<style>.demo-notice`.
- **Data** `const DEMO` hardcoded: name `Restivo Demo — Grill & Pizza`, `openNow true`, settings `{USD, delivery 150, primary #c73d18}`, 3 categories (Grill, Pizza, Desserts), 6 items (Mixed Grill 1899, Shawarma 650, Margherita 1200, Pepperoni 1350, Baklava 999, Kunafa sold-out) all `image_path /images/logo-placeholder.svg` (existing, cached).
- **Render** functions `renderHero()`, `renderChips()`, `renderMenu()` mimic `restaurant.js` but **no `api.get('/api/.../menu')`**, no `fetch`. Search input filters locally, category chips `all/popular/category`, price ticket `+` button.
- **Cart** `cart={}`, `subtotal()`, `totalUnits()`, `updateBar()` (pill `x items • $YY`), `flyToCart` omitted (simpler, less JS). Sheet `#sheet` + backdrop, quantity `−/+`, `pickup/delivery` toggle (fee 150), form name+WA+notes, `placeOrder` just validates name/WA, clears cart, shows success `Demo — تم! Browse real restaurants → /app` + `Get Started`, no `POST`.
- **Header** `mk-nav` with Back to site + Get Started. Notice `.demo-notice` yellow: “Demo — no orders are sent… View real restaurants → /app”.
- **Performance:** 0 DB, 0 `/api`, 0 `/uploads` (except placeholder SVG which is cached). Suitable for GoogleBot instantly.

---

## 6) Marketing Subpages — `client/*.html` (all include skeleton + site.js)

Generator `python3 mk_page(...)` created each with same nav/footer + unique SEO.

| File | Title | Description (unique) | H1 | Key body |
|------|-------|----------------------|-----|----------|
| `features.html` | Features — Digital Menu, QR, Online Ordering | Explore Restivo features: digital menu, QR… | Features that actually exist — no mockups | 8 feature cards + dashboard menu vs settings 2-col |
| `how-it-works.html` | How It Works — Create, Share, Receive | Learn 3 steps: create, share, receive… | How Restivo works | 3 steps detail + customer sees 5-step list + flow |
| `pricing.html` | Pricing — $8.99/month, 0% | Restivo pricing $8.99 0%… 7-day trial | Simple pricing — $8.99/month | centered price card + FAQ pricing note |
| `for-restaurants.html` | Digital Menu for Restaurants — QR & Online | Digital menu for restaurants: QR table… | For Restaurants | 2-col why + perfect for + links to other 3 |
| `for-cafes.html` | Digital Menu for Cafes — QR & Online | Cafe digital menu: fast QR… | For Cafes | counter QR, variants as items, reorder |
| `for-dessert-shops.html` | Online Menu for Dessert Shops | Dessert shop online menu: visual catalog… | For Dessert Shops | gallery, categories, large orders, tip |
| `for-cake-shops.html` | Online Ordering for Cake Shops | Cake shop online ordering: pre-orders… | For Cake Shops | pre-order notes, pickup/delivery, booking |
| `contact.html` | Contact — Get Your Restaurant Online | Contact Restivo WhatsApp +972567439846… | Contact — Let's get… | WhatsApp button + what we need list |
| `resources/index.html` | Resources — Restivo | Restivo resources — guides… | Resources | 5 “Coming soon” cards (digital vs printed etc.) |
| `404.html` | Page not found — Restivo | Noindex, centered h1 + 4 links Home/Demo/Login/Restaurants |

All have `site.js` + `i18n.js` (added post-gen), `skeleton.css`, canonical `/file.html`, OG.

---

## 7) SEO Architecture

- **Every marketing page** has unique `<title>` (50-65ch), unique `meta description` (140-160ch), `canonical` absolute (`/` or `/pricing.html` etc.), `og:title/description/image`, `twitter`, `favicon`, `theme-color`.
- **Heading hierarchy:** `h1` once per page (hero/h1), then `h2` sections, `h3` cards — no `h1` duplicate.
- **Internal links:** homepage nav/footer links to all 8+ marketing pages + demo + app; each industry page cross-links to other 3; resources pending.
- **Images:** all `<img>` have `alt=""` (decorative) + `loading="lazy"` except hero (eager). Alt text descriptive where needed.
- **No JS-only SEO:** marketing hero + features + pricing are **in static HTML**, not rendered by `restaurant.js` fetch, so GoogleBot sees text without JS.
- **Private noindex:** `client/login.html`, `admin.html`, `owner.html`, `delivery.html`, `leads.html`, `offer.html`, `offers.html`, `track.html`, `app/index.html` all now include `<meta name="robots" content="noindex, nofollow, noarchive">` via python injection.
- **CSS/JS not blocked:** `robots.txt` explicitly allows.

**`robots.txt`** (`site.routes.js:12`, also reachable as `client/robots.txt` if static): Allow `/`, `/restaurant/`, `/demo.html`, `/features.html` etc., Disallow `/api/`, `/admin.html`, `/owner.html`, `/delivery.html`, `/leads.html`, `/offer/`, `/app/`, Sitemap `origin/sitemap.xml`.

**`sitemap.xml`** (`site.routes.js:24`, `GET /sitemap.xml`): static 10 URLs (/, features, how-it-works, pricing, demo, 4 for-*, contact, resources/, app/) + dynamic up to 500 active restaurants `SELECT slug, updated_at FROM restaurants WHERE is_active AND (subscription_ends_at IS NULL OR > now())` with `lastmod`, `priority 1.0` for `/`, `0.8` marketing, `0.6` restaurants, `changefreq weekly`, `Cache-Control public max-age 3600`. Falls back to static only if DB down.

**Structured data** (`index.html:22`): `Organization` (Restivo, url, logo) + `SoftwareApplication` (BusinessApplication, offers $8.99). Subpages have Organization only + ready for `BreadcrumbList` via sections.

**Social:** OG image `/icons/icon-512.png`, `og:locale ar_AR`, share on WhatsApp/Facebook will show Restivo card.

---

## 8) Language — Single URL (per your request)

- **Default:** `html lang="ar" dir="rtl"` on marketing pages.
- **Toggle:** `client/js/i18n.js:385` now has `navFeatures`, `heroBadge/Title/Desc/Note` in AR + EN. `injectToggle()` looks for `.topbar-inner` OR `.mk-nav-inner` and inserts `#lang-toggle` before burger. Click toggles `localStorage site_lang`, `documentElement.lang/dir`, `data-i18n` text. No `/en` or `/ar` folders.
- **Why single URL:** you asked to keep it like before, less maintenance, one canonical, no `hreflang` split. Tradeoff: Google sees primarily AR content; EN is JS-swapped. Acceptable per request.

---

## 9) Skeleton Loader — Every Page (`client/css/skeleton.css` + `client/js/skeleton.js`)

**Files:**
- `client/css/skeleton.css` (≈120 lines) — `#app-skeleton` fixed inset 0 `z-index 9999` `bg var(--bg)`, topbar 64px with logo/brand/nav skeleton shimmers, hero 2-col grid (pill, 2 h1 bars, 2 p bars, 2 CTA bars, visual phone + 3 cards), cards grid 5 mini. `.shimmer::after` linear gradient `translateX(-100% → 100%)` 1.2s infinite, respects `prefers-reduced-motion`. Offline bar `.sk-offline` fixed bottom center ink + retry button, retry modal `.sk-retry` center card.
- `client/js/skeleton.js` (≈50 lines) — hides skeleton on `window load + 320ms` or `readyState complete`, fallback `3800ms` hide regardless; listens to `online/offline` + `navigator.connection` (saveData/2g/downlink) to show offline bar after 900ms, slow bar 4s, retry buttons `location.reload()`, cleans up DOM after 400ms fade.

**Injection:** python injected into **all 22 HTML files** (`client/*.html`, `client/app/*.html`, `client/resources/*.html`):
- `<link rel="stylesheet" href="/css/skeleton.css">` after `style.css`/`marketing.css` in `<head>`.
- Right after `<body>` opening: `<div id="app-skeleton">…shimmer…</div><div id="sk-offline">…</div><div id="sk-retry">…</div>`.
- Before `</body>`: `<script src="/js/skeleton.js"></script>` (after other scripts).

**Behavior step-by-step:**
1. Browser parses `<head>` → paints skeleton instantly (no JS needed, CSS blocks render, skeleton is first paint).
2. HTML streams, real content loads behind skeleton (opacity 1).
3. `skeleton.js` waits for `load`; when complete hides skeleton via `.hide` (opacity 0, visibility hidden) then removes node.
4. If connection offline → `navigator.onLine false` → shows `You appear offline — check your connection [Retry]` bar + center modal `Connection is slow or offline`. Click Retry reloads.
5. If 2G/saveData → shows “Slow connection — loading may take longer” toast 4s.
6. If load never fires (blocked resources) → fallback hide at 3.8s so page never stuck.

**SW:** `client/sw.js` CACHE bumped `restaurants-v8 → v9`, SHELL adds `marketing.css`, `skeleton.css`, `skeleton.js`, `site.js`, `demo.html`, `/app/` for offline shell. `fetch` still network-first for navigations, cache fallback to `/` if fetch fails (so offline still shows homepage skeleton then cached shell).

---

## 10) Stack & Architecture (unchanged core)

- **Runtime:** Node ≥20, Express 4, `helmet`, `express-session` + `connect-pg-simple` (PG session store), `express-rate-limit`, `multer` (memory → `bytea`), `pg`, `qrcode`, `bcryptjs`.
- **Frontend:** vanilla HTML/CSS/JS, no framework, `fetch`, `CSP default-src 'self'` (`server/app.js:39`).
- **DB:** PostgreSQL 15/17 via Wasmer managed (`DB_HOST/PORT/NAME/USERNAME/PASSWORD` TLS `rejectUnauthorized false`) or `DATABASE_URL`. Migrations `001_init` → `015_platform_settings`.
- **Config:** `config/index.js` reads `PORT`, `TRUST_PROXY`, `SESSION_SECRET ≥32` in prod, `APP_URL`, `TRUST_PROXY`, `UPLOAD_DIR`, `MAX_UPLOAD_MB 2-5`, `CANCEL_GRACE_MINUTES 15`.
- **Pooling:** `server/db/pool.js` `Pool` + `withTx`.

---

## 11) Database Schema (all migrations applied)

Tables: `restaurants(id, slug unique, name, status open|closed|temporarily_closed, is_active, max_menu_items 1-10k, subscription_ends_at timestamptz, created_at)`, `users(id, role owner|admin|staff|delivery, restaurant_id FK, delivery_group_id FK, username, email, password_hash, is_active)`, `restaurant_settings(restaurant_id PK, description, phone, whatsapp, address, timezone UTC default, logo_path, cover_path, primary_color, secondary_color, currency USD 3, delivery_fee_cents, ignore_opening_hours)`, `restaurant_hours(restaurant_id, day 0-6, is_closed, opens_at 09:00, closes_at 22:00)`, `categories(id, restaurant_id, name, position)`, `menu_items(id, restaurant_id, category_id, name, description, price_cents, image_path /uploads/...36-char.webp, is_available, is_popular, position)`, `orders(id, code unique 6-12 alnum, restaurant_id, customer_name/whatsapp/phone/address/order_type pickup|delivery/notes/subtotal/delivery/total/status pending…cancelled, created_at, archived_at)`, `order_items(order_id, item_id, name, price_cents, quantity)`, `session(sid)`, `uploaded_files(id, subdir logos|covers|items, filename, mime, size, data bytea)`, `delivery_groups(id, name unique, phone, notes)`, `restaurant_delivery_groups`, `leads` + `search_runs` + `platform_settings` (new). All FK `ON DELETE CASCADE`, indexes on `restaurant_id`, `code`, `status`.

---

## 12) API Reference (all under `/api`, verified)

- **`GET /api/healthz` → {ok:true}**
- **Auth `/api/auth`** `POST /login {username,password} → session`, `POST /logout`, `GET /me`
- **Public**
  - `GET /api/restaurants → {restaurants:[{slug,name,description,logoPath,coverPath,itemCount,openNow}]}` via `restaurants.service.listPublicDirectory` (filters `is_active` + subscription).
  - `GET /api/restaurants/:slug/menu → public view {name,slug,openNow,settings,hours,categories,items,deliveryGroups}`
  - `POST /api/restaurants/:slug/orders` orderLimiter → `validateCheckout` → subscription check → `ordersService.createCheckout` → `sse broadcast order:new` → `{order:{code,status,totalCents}}`
  - `POST /api/restaurants/:slug/bookings` similar → booking.
  - `GET /api/orders/track/:code` → order + items
  - `POST /api/orders/cancel {code}` within grace
  - `GET /api/pricing → {pricing:{pricing_cents,pricing_currency}}` **new**
  - `GET /api/offer/:code` public lead preview
- **Admin `/api/admin` requireAuth + requireRestaurantAdmin** (checks `restaurant_id` from session user, re-validates trial each request): `GET /restaurant`, `PATCH /status`, `GET /dashboard`, `GET /analytics`, `GET /qr`, `GET /events` SSE, categories/items CRUD, orders, bookings, `GET/PATCH /settings`, `PUT /hours`, `GET/PUT /delivery-groups`, `POST /images?type=logos|covers|items&itemId=`
- **Owner `/api/owner` requireAuth + (owner|staff)** with `forbidStaffDelete` on DELETE: `GET /overview`, `GET /reports/restaurants.csv`, `GET/POST /restaurants`, `GET/PATCH/DELETE /restaurants/:id`, staff CRUD, admins CRUD + reset, `GET /restaurants/:id/orders`, delivery groups, `GET/PATCH /platform-pricing` **new**
- **Leads** `/api/owner/leads` (owner) `GET /stats`, `/search-runs`, `POST /bulk`, `/merge`, `GET/POST /`, `GET/:id`, `POST/:id/research`, etc.
- **Delivery** `/api/delivery` role delivery.

**Rate limits:** `rateLimits.global 300/15m`, `auth 10/15m`, `order 20/hour`.

---

## 13) Appearance — Design System

- **Colors:** parchment `--bg #fdf6ec`, surface `#fffdf5`/`#fdf1d8`, ink `#1b1e1c`, text `#2a2e26`, muted `#7a756e`, border `#e8ddd0`, primary `Restivo #c73d18` (derive `primary-dark #a33214`, `light #fde9e2`), secondary `#2f3f2e`/`#1f2a1f`, saffron `#e9b44c`, danger `#c23a26`.
- **Typography:** display `El Messiri`, UI `Cairo`, body `Almarai`, mono `SF Mono`. Self-hosted woff2 in `/fonts` (`fonts.css`). Scale clamp for hero `2rem → 2.9rem`.
- **Shapes:** `--radius 14px`, `--radius-lg 20px`, shadow soft + lg, glass blur on sticky navs.
- **Marketing tokens:** `.mk-container max 1120px`, `.mk-section 36px` vertical, `.mk-grid` 2-col hero, trust 5-col, features 3-col (2-col ≤900, 1-col ≤560), industries 4-col.
- **Motion:** `rise .4s` staggered cards, `fly-ghost` cart, `pulse` cart bar, `shimmer` skeleton 1.2s, all `prefers-reduced-motion` disabled.

---

## 14) How The Website Appears — User Journey (Desktop & Mobile)

1. **First paint (0-200ms):** skeleton appears instantly (topbar shimmer + hero shimmer + cards shimmer), even on 2G/offline. Real marketing HTML loads behind.
2. **Load (300ms-1s):** `window.load` → skeleton fades → marketing homepage visible: sticky nav (Restivo R mark, 4 links, Login, Get Started, burger), hero 2-col with badge, h1, lead, 2 CTAs, phone mock + QR + cart pill.
3. **Scroll:** trust 5 cards → demo muted band (2-col, preview card) → problem bullets vs solution card → how 3 steps + flow → 8 features → showcase dual cards + flow → 4 industries → pricing card ($8.99) → FAQ 9 details → ink CTA band → footer.
4. **Click Demo → `/demo.html`:** skeleton then static storefront hero (gradient cover, logo, open badge), chips `الكل/Popular/Grill...`, search, 6 cards with price ticket + `+`. Add to cart → pill bottom shows count + total, sheet slides up with qty, pickup/delivery, total, form, Place Order (demo toast).
5. **Click Get Started → `/app/`:** skeleton then directory grid `GET /api/restaurants` (live). Search filter, card shows cover/logo/name/description/itemCount/open badge, click → `/restaurant/:slug` (real storefront `restaurant.js` fetch menu, theme via `primaryColor`, hero, chips, search, grid, cart fly-to-cart, sheet checkout `POST /api/restaurants/:slug/orders` → code + track link, or `wa.me` prefilled).
6. **Track → `/track`:** enter code `K7M2XQ4B` → `GET /api/orders/track/:code` → timeline `pending→confirmed→preparing→ready→out_for_delivery→completed` + items + totals + cancel if grace.
7. **Login → `/login.html`:** form identifier+password → `POST /api/auth/login` → role redirect `owner/staff→/owner.html`, `admin→/admin.html`, `delivery→/delivery.html`. Trial expired → `SUBSCRIPTION_EXPIRED` message.
8. **Admin → `/admin.html`:** sticky topbar, side nav + mobile tabs, 7 tabs: Dashboard (stats ordersToday/pending/revenue/menu usage + subscription card + pending list), Orders (filter, pagination, status actions, delete), Bookings (date/time/tables, confirm via WA), Menu (categories + items table toggle availability/popular, upload progress), Settings (profile, appearance colors with live preview, logo/cover, status, delivery companies chooser, 7-day hours), Analytics (7/30/90 days, by hour/day, daily, top items, CSV), Share (link + QR). SSE live `order:new`.
9. **Owner → `/owner.html`:** topbar + overview stats, **new pricing card** (price input + currency select + Save → PATCH), staff card add-only, delivery companies (add/edit via PATCH), restaurants table (search, filter active/inactive, pagination, Public/Manage/Edit/Disable/Delete). Manage modal stats + admins + recent orders. Pricing change reflects instantly on marketing via `/api/pricing`.
10. **Offline/slow:** if `navigator.onLine false` or `connection.effectiveType 2g` → bottom ink bar + center modal with Retry, skeleton stays until reload.

---

## 15) File Inventory — Every Single File

**Root:** `package.json` (0.1.0, Node≥20, express/bcryptjs/pg etc.), `package-lock.json`, `server.js` (boot + migrate + listen), `app.yaml` (Wasmer App `restaurants` `fr-roub1` `node-base` `edgejs_precompile`), `config/index.js` (env validation), `.env.example`, `.gitignore`, `DEPLOYMENT.md`, `README.md`, `HANDOFF.md`, `SALES_SYSTEM_GUIDE.md`, `outreach-templates.md`, `session-ses_fcbe.md`, `nowadded.html`, `amman-leads.csv`, `a.md` (this file).

**Database:** `database/migrate.js` (runner + `schema_migrations`), `migrations/001_init.sql` … `015_platform_settings.sql` (15 files), `seeds/seed-admin.js`, `seed-demo.js`.

**Server:** `server/app.js` (helmet, static `client` extensions html, `/uploads/:subdir/:filename` from `uploaded_files`, session PG, attachUser, pages `/app|/restaurant/:slug|/track|/delivery|/leads|/offer/:code|/resources`, PWA routes, `siteRoutes`, `api` limiters, error handlers), `server/db/pool.js` (Pool, `withTx`, `query`), `server/middleware/auth.js` (attachUser, requireAuth/Owner/OwnerOrStaff/RestaurantAdmin/forbidStaffDelete/requireDelivery, tenantIdOf), `csrf.js` (originGuard SameSite), `ratelimit.js` (global/auth/order), `sse.js` (hub broadcast), `upload.js` (multer memory → magic-byte), `server/controllers/*.js` (auth, admin, owner+platformPricing, delivery, leads), `server/services/*.js` (restaurants, orders, bookings, users, settings, delivery, categories, menu, files, leads, enrichment, platform), `server/routes/*.js` (auth, public+pricing, admin, owner+platformPricing, delivery, leads, site+robots+sitemap+r), `server/utils/*.js` (errors with AppError + notFoundHandler HTML, checks, csv, datetime isOpenNow, ids orderCode), `server/validators/index.js` (login, restaurant, username, password, category, item, settings, hours, checkout, booking, delivery, platformPricing, pagination).

**Client:** `client/index.html` marketing, `client/app/index.html` directory, `client/restaurant.html` storefront, `client/track.html`, `client/login.html`, `client/admin.html`, `client/owner.html`, `client/delivery.html`, `client/leads.html`, `client/offer.html`, `client/offers.html`, `client/demo.html` static, `client/features.html`, `how-it-works.html`, `pricing.html`, `for-restaurants.html`, `for-cafes.html`, `for-dessert-shops.html`, `for-cake-shops.html`, `contact.html`, `resources/index.html`, `404.html`, `client/css/style.css` 890 lines parchment, `storefront.css`, `marketing.css` 170 lines, `skeleton.css` 80 lines, `offers.css`, `client/js/api.js` (request + esc + fmtMoney + compressImage + theme buildTokens), `i18n.js` 800 lines AR/EN dict + toggle, `home.js` grid, `restaurant.js` 624 lines cart + hero + chips + fly + sheet, `track.js`, `admin.js` 1050 lines dashboard, `owner.js` 628 lines + pricing, `leads.js`, `offers.js`, `delivery.js`, `site.js` (burger + pricing fetch + scroll), `skeleton.js` (hide + offline), `pwa.js` (SW register), `sw.js` (CACHE v9 shell navigation network-first), `manifest.webmanifest` (Restivo, standalone, icons), `fonts/fonts.css` + `almarai-400/700, cairo-700/800, elmessiri-700 woff2`, `icons/icon.svg/192/512`, `images/logo-placeholder.svg`.

**Scripts:** `scripts/check-syntax.js` (node syntax check 65 files), `autoretry-deploy.sh`.

**Tests:** `tests/helpers.js` (startApp with TEST_DATABASE_URL, truncate, server ephemeral), `auth.test.js`, `menu.test.js`, `orders.test.js`, `tenant-isolation.test.js`, `misc.test.js`, `v2.test.js`.

---

## 16) Commands & Deployment

```bash
npm ci                  # install
cp .env.example .env    # set DATABASE_URL, SESSION_SECRET ≥32, APP_URL
npm run migrate         # apply 001..015
npm run seed:admin      # creates owner from SUPER_ADMIN_USERNAME/PASSWORD
npm start               # listens $PORT
npm run check           # syntax 65 files
TEST_DATABASE_URL=postgresql://.../test npm test   # full suite (needs disposable PG)
wasmer deploy --build-remote   # Wasmer Edge + managed PG (fr-roub1), needs `wasmer login` + `app.yaml` name `restaurants` matches `idkrealyyea/restaurants`
```

**Deploy notes:** keep `app.yaml` `name: restaurants` exactly, region `fr-roub1`, `wasmer app database list --with-password` to get `DB_*`, set `SESSION_SECRET`, run migrate against `DB_*`, hard-refresh CDN (≈1h cache) after deploy.

---

## 17) Performance, Accessibility, etc.

- **Performance:** marketing homepage 23KB HTML + 3 CSS (fonts, style, marketing) + 4 JS (i18n, api, site, pwa) + skeleton CSS 3KB. Images lazy except hero, `max-age 1h` static, `skeleton` first paint <200ms, demo 0 API. `site.js` pricing fetch `Cache-Control public 3600`. SW caches shell for offline.
- **Accessibility:** semantic `nav/main/section/header/footer`, `h1→h2→h3` hierarchy, `aria-label`, `aria-live` for offline, `role=status/alert`, `focus-visible` outline `primary 55%`, keyboard nav (burger, drawer, esc to close sheet), `prefers-reduced-motion` disables shimmer/rise.
- **Mobile:** mobile-first grid, hero stacks at 900px, nav burger <900px, trust 5→2 col, features 3→2→1, industries 4→2→1, funds safe-area-inset padding.
- **CSP:** `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'` (for color picker), `img-src 'self' data: blob:`.

---

## 18) Checklist Before Closing (verified via live fetch)

- [x] Skeleton appears before real content, hides on `load` + fallback 3.8s, shows offline bar on no internet.
- [x] `/` marketing loads with title, hero, Trust, Demo, Problem, How, Features, Showcase, Industries, Pricing $8.99, FAQ, CTA, footer.
- [x] `/demo.html` static, no `/api/restaurants` string, cart works offline.
- [x] `/app/` directory still lists restaurants via `home.js`.
- [x] `/restaurant/:slug` storefront still `GET /api/restaurants/:slug/menu` + checkout.
- [x] `/login.html` + `/admin.html` + `/owner.html` noindex, pricing card saves.
- [x] `/api/pricing` returns 200 `{pricing_cents:899}` even without DB.
- [x] `/robots.txt` + `/sitemap.xml` 200, sitemap includes 10 static + 500 slugs if DB.
- [x] `/r/:slug` 301 to `/restaurant/:slug`.
- [x] `npm run check` 65 files 0 failures.
- [x] No console errors on marketing, no broken links (internal links all `/` relative).

---

*End of a.md — Restivo is ready. Visit `/` for marketing, `/demo.html` for static demo, `/app/` for real directory, `/login.html` for dashboards, `/owner.html` pricing card to change $8.99.*
