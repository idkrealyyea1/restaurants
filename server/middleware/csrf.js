'use strict';

/**
 * CSRF defense-in-depth for same-origin JSON API:
 *  - session cookie is SameSite=Lax (set in app.js)
 *  - mutating requests must carry an Origin header matching this deployment
 *  - additionally, a browser request that declares itself cross-site
 *    (Sec-Fetch-Site: cross-site) must carry a matching Origin — this
 *    closes the gap where a mutating request carried no Origin at all.
 * Non-browser clients (curl, server-to-server) send neither header and
 * pass; browsers always send Origin on cross-site and most same-site POSTs.
 * NOTE: a full synchronizer CSRF token is still a recommended follow-up
 * (see README "Security follow-ups"); Origin + Sec-Fetch-Site is the
 * defence-in-depth layer that does not change any client flow.
 */

const config = require('../../config');
const { forbidden } = require('../utils/errors');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function hostOf(urlString) {
  try {
    return new URL(urlString).host;
  } catch {
    return null;
  }
}

function originGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();

  const allowedHosts = new Set([req.headers.host]);
  if (config.appUrl) {
    const h = hostOf(config.appUrl);
    if (h) allowedHosts.add(h);
  }
  // Optional split frontend (Cloudflare Pages → Render API). Unset by
  // default, so single-origin deployments behave exactly as before.
  if (config.frontendHost) allowedHosts.add(config.frontendHost);

  // A browser cross-site mutation must prove its origin. Previously a
  // request with no Origin passed unconditionally; now cross-site
  // declarations without a matching Origin are rejected.
  if (fetchSite === 'cross-site') {
    if (origin && allowedHosts.has(hostOf(origin))) return next();
    return next(forbidden('BAD_ORIGIN', 'Cross-origin request rejected'));
  }

  if (!origin) return next();

  if (allowedHosts.has(hostOf(origin))) return next();
  next(forbidden('BAD_ORIGIN', 'Cross-origin request rejected'));
}

module.exports = { originGuard };
