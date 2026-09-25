# Quickstart: Validating Stabilization

Prereqs: Node >= 20, disposable Postgres, `TEST_DATABASE_URL` pointing at it (never prod).
`tests/helpers.js` refuses to run without it.

```sh
npm install
npm run check            # 0 failures required before any deploy claim
node --test tests/       # full suite on disposable DB
```

## Slice validation (each independently)

1. Isolation (S1/S4): run tenant probe matrix — `tenant-isolation.test.js` + staff-remit cases.
   Expect 100% DENY with zero leaked rows; `contracts/isolation-matrix.md` is the oracle.
2a. Concurrent burst (S2, concern A): 50 simultaneous order submissions from different customers
   on the same items + overlapping bookings + cancel-at-deadline. Expect each success to create
   exactly one order with cent-correct totals, legitimate rejections to create nothing, single
   booking wins, and deterministic cancel outcomes.
2b. Duplicate replay (S2, concern B, separate test): send the same customer's order twice. Expect a
   single persisted order for that intent.
3. Delivery toggle (S5): disable delivery on a restaurant → delivery order submission rejected, pickup works;
   retired delivery credentials denied everywhere.
4. Vanilla serving (S6): `npm start` locally → `/`, `/app/`, `/restaurant/:slug`, `/track`, login,
   dashboards, pricing, robots, sitemap, 404 HTML vs JSON — all green; strings consistent ($19.99
   from `platform_settings`).
5. Load (S7): 10× dev traffic (50-burst, 10 order submissions/min sustained) → 95% hot paths < 2s, zero lost
   orders. Profile menu/orders/analytics queries; fix N+1 found.
6. Deploy safety (S10): migrate → seed → `/api/healthz → {ok:true}` on a staging-equivalent env;
   no deploy without explicit user approval.

Rollback per slice is `git revert` of that slice's commit(s); migrations are append-only and
backward compatible, so revert never requires a down-migration.
