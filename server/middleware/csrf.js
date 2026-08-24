'use strict';

/**
 * CSRF defense-in-depth for same-origin JSON API:
 *  - session cookie is SameSite=Lax (set in app.js)
 *  - mutating requests must carry an Origin header matching this deployment
 * Non-browser clients (curl, server-to-server) send no Origin and pass;
 * browsers always send Origin on cross-site and most same-site POSTs.
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
  if (!origin) return next();

  const allowedHosts = new Set([req.headers.host]);
  if (config.appUrl) {
    const h = hostOf(config.appUrl);
    if (h) allowedHosts.add(h);
  }

  if (allowedHosts.has(hostOf(origin))) return next();
  next(forbidden('BAD_ORIGIN', 'Cross-origin request rejected'));
}

module.exports = { originGuard };
