# Restaurants Platform

A multi-tenant online-ordering SaaS: a platform owner creates restaurants; each restaurant gets a public menu page, a private dashboard, and receives orders from customers who never need an account.

**Stack:** Node.js 20+, Express, PostgreSQL, vanilla HTML/CSS/JS. No frontend framework, no Docker requirement, no local database.

---

## Architecture

```
MY LAPTOP                      REMOTE BUILD/RUN ENV                PRODUCTION
┌───────────────┐   files    ┌──────────────────────────┐        ┌─────────────────┐
│ source code   │──────────▶│ npm install / migrate /   │──────▶│ Wasmer Edge      │
│ config, docs  │            │ tests, app execution      │ deploy│  this app        │
└───────────────┘            └────────────┬─────────────┘        └────────┬────────┘
                                          ▼                               ▼
                                   disposable PostgreSQL          managed PostgreSQL
                                   (tests/dev only)               via DATABASE_URL
```

- **Frontend** (`client/`): static HTML/CSS/JS served by Express. CSP forbids inline scripts/styles.
- **Backend** (`server/`): REST API. routes → controllers → services → parameterized SQL.
- **Database** (`database/`): plain-SQL migrations + seeds. Prices are integer **cents**; orders **snapshot prices at purchase time**.

### Project structure

```
client/                 static pages + js/css/images
server/
  controllers/          HTTP glue
  services/             business logic + SQL
  middleware/           auth, CSRF/origin, rate limits, uploads, SSE
  validators/           input normalization (mass-assignment safe)
  db/pool.js            pg pool + transaction helper
  utils/                errors, validation checks, datetime/opening-hours, ids
database/
  migrations/001_init.sql
  migrate.js            idempotent runner
  seeds/                platform owner bootstrap + optional demo data
config/index.js         env loading/validation
tests/                  node:test suite (runs against TEST_DATABASE_URL only)
```

## Environment variables

Copy `.env.example` → `.env` and fill in real values (never commit `.env`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Remote PostgreSQL connection string |
| `SESSION_SECRET` | ≥32 random chars in production (`openssl rand -base64 48`) |
| `APP_URL` | Public base URL (QR codes/share links) |
| `NODE_ENV` | `production` enables Secure/`__Host-` cookies, HSTS, strict checks |
| `PORT`, `TRUST_PROXY` | Hosting-injected port / proxy hops |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Image storage root and per-file cap |
| `SUPER_ADMIN_USERNAME/PASSWORD` | Bootstrap owner account for `npm run seed:admin` |

Production guard rails: the app **refuses to start** with a localhost `DATABASE_URL` or a weak `SESSION_SECRET` when `NODE_ENV=production`.

## Running (remote execution environment)

```bash
npm ci                       # or npm install
cp .env.example .env         # fill in remote DATABASE_URL etc.
npm run migrate              # apply schema
npm run seed:admin           # create the platform owner from env
npm start                    # listens on $PORT
```

Optional demo restaurant (development only): `SEED_DEMO_PASSWORD=... npm run seed:demo` → logs in at `/login.html` as `burger-admin`.

## Testing (remote)

```bash
TEST_DATABASE_URL=postgresql://user:pass@disposable-host/testdb npm test
```

The suite refuses to run without an explicit `TEST_DATABASE_URL`. It migrates the schema into the target database, truncates all tables, boots the real app on an ephemeral port and covers:

- auth (login/logout/me, session revocation on password reset & deactivation, no user enumeration)
- **multi-tenant isolation** — restaurant A denied every read/write path into restaurant B (items, categories, orders, uploads, query-param spoofing, owner endpoints)
- backend-enforced menu limits (race-safe row lock), categories/items CRUD
- checkout math, price tampering ignored, delivery fee, availability, closed/outside-hours enforcement (server-side clock/timezone)
- status transition rules, tracking by code, price snapshotting after menu changes
- upload sniffing (MIME + magic bytes), QR, SSE auth, malformed bodies, cross-origin rejection, order rate limiting

## Deployment (Wasmer Edge + managed Postgres)

> **Full beginner-friendly walkthrough: [DEPLOYMENT.md](DEPLOYMENT.md)** — every click and command, no experience needed.

Short version:

1. Provision a managed PostgreSQL instance; note the connection string.
2. From your remote build environment: set secrets (`DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `NODE_ENV=production`) via the Wasmer dashboard or `wasmer deploy` env config — never in the repo.
3. Run `npm run migrate` once against the managed DB.
4. `wasmer deploy` (uses `wasmer.toml` / `app.yaml`; verify current schema against [Wasmer docs](https://docs.wasmer.com/edge)).
5. Create the owner: run `npm run seed:admin` locally against the production DB URL (then unset those env vars).

The app is stateless apart from `UPLOAD_DIR` images — see limitations below. `process.env.PORT` is used everywhere; no hardcoded ports.

## Security model (summary)

- Passwords: bcrypt (cost 12). Never returned by any API.
- Sessions: server-side store in Postgres, HttpOnly + SameSite=Lax cookies, `__Host-` prefix + Secure in prod, regeneration on login, immediate revocation on password reset/deactivation.
- Multi-tenancy: restaurant identity resolved **only** from the session user's DB record; all tenant queries are scoped by `restaurant_id`.
- Money: computed server-side from DB prices; client-sent totals/prices ignored entirely.
- CSRF: SameSite cookie + Origin-header check on mutating requests.
- Injection/XSS: parameterized SQL only; strict CSP (`default-src 'self'`, no inline); HTML escaping helper in all dynamic rendering.
- Uploads: magic-byte sniffing, MIME allow-list, size cap, random filenames inside fixed dirs, traversal-proof deletes.
- Rate limits: global API, login, and checkout limiters; JSON error envelope; centralized error handler that hides internals.

## Known limitations / roadmap

- Uploaded images live on the server filesystem. On ephemeral hosts they vanish on redeploy — wire object storage (e.g. S3-compatible) into `server/middleware/upload.js` before relying on it in production.
- Rate limiting and the SSE hub are in-process (single instance). Add a shared store/bus before horizontal scaling.
- Analytics are basic aggregates; no exports yet.
- `wasmer.toml`/`app.yaml` should be validated against the Wasmer docs version you deploy with.
