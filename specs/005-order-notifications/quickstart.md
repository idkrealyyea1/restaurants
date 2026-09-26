# Quickstart: Validating Order Notifications

Prereqs: Node >= 20, disposable Postgres, `TEST_DATABASE_URL` (never prod).
`tests/helpers.js` refuses to run without it; run suites one file at a time
(multi-file runs share one DB and interfere — pre-existing harness trait).

```sh
npm install
npm run check            # 0 failures required
node --test tests/notifications.test.js
```

## Slice validation (each independently)

1. Offline inbox: place an order with no dashboard session → open dashboard → notification
   appears unread; unread count matches stored rows.
2. Online push: with a live dashboard session, place an order → notification appears without
   refresh; reload → still present exactly once (proves persist-first, event-second).
3. Isolation: orders at restaurants A and B → A session sees only A, B only B, owner sees both
   with restaurant context; direct-ID access across tenants denied.
4. Silence: failed validation, rejected business rule, and replayed submission →
   notifications equal persisted orders (zero for failures, one set per persisted order).
5. Burst: 50 concurrent orders → exact notification sets per recipient (50 restaurant rows for
   the single admin + 50 owner rows in a one-admin/one-owner fixture), none lost/duplicated.
6. Reads: mark read as one admin → other admin unaffected; state survives logout/login;
   cross-user mark-read denied.
7. Deploy safety: migration 021 applies on empty and populated databases (additive only);
   `npm run check` green; no new dependencies (`git status` shows none in `package.json`).

Rollback per slice is `git revert`; migration 021 is additive (new table only).
