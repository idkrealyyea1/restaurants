# Live-verify (T036) — 2026-09-25

The live Wasmer deployment state could NOT be inspected from this environment (no
deployment credentials or URL available). Proceeding on repo-level safety only:

- `scripts/check-no-react-refs.sh` passes: nothing outside `frontend/` references the bundle.
- Serving re-pointed to `client/` and smoke-tested locally (all key pages 200, correct files,
  404s real). The change takes effect on the next approved deploy — and constitution XXI
  forbids deploying without explicit user approval, so production cannot shift silently.
- RISK: if the live deployment serves traffic from a previously deployed `frontend/dist`
  bundle, that bundle keeps serving until the next deploy. Verify post-deploy that served pages
  are vanilla (e.g. `/restaurant/<slug>` contains `#live-content`, no `/assets/app.js`).
