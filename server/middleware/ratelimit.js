'use strict';

/**
 * Rate limiters (per client IP; TRUST_PROXY controls proxy awareness).
 * In-memory store: adequate for a single node. For horizontal scaling,
 * swap in a shared store — do not rely on these across replicas.
 */

const rateLimit = require('express-rate-limit');
const config = require('../../config');

function jsonHandler(req, res) {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests from your address. Please try again later.',
    },
  });
}

const globalLimiter = rateLimit({
  windowMs: config.rateLimits.global.windowMs,
  limit: config.rateLimits.global.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
});

const authLimiter = rateLimit({
  windowMs: config.rateLimits.auth.windowMs,
  limit: config.rateLimits.auth.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
});

const orderLimiter = rateLimit({
  windowMs: config.rateLimits.order.windowMs,
  limit: config.rateLimits.order.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
});

module.exports = { globalLimiter, authLimiter, orderLimiter };
