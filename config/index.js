'use strict';

/**
 * Central environment configuration.
 * Reads and normalizes process.env once at startup; fails fast on invalid
 * production settings. Never logs secret values.
 */

const path = require('path');

function intEnv(name, def) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return def;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer (got "${raw}")`);
  }
  return n;
}

const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
const isProd = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

let trustProxy = process.env.TRUST_PROXY || '0';
trustProxy = Number.parseInt(trustProxy, 10) >= 1 ? 1 : 0;

let appUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
if (appUrl && !/^https?:\/\//i.test(appUrl)) {
  throw new Error('APP_URL must start with http:// or https://');
}

let sessionSecret = process.env.SESSION_SECRET || '';
if (isProd && (!sessionSecret || sessionSecret.length < 32)) {
  throw new Error('SESSION_SECRET must be set to at least 32 random characters in production.');
}
if (!sessionSecret && !isProd) {
  sessionSecret = `dev-insecure-secret-${Math.random().toString(36).slice(2)}`;
  // eslint-disable-next-line no-console
  console.warn('[config] WARNING: SESSION_SECRET not set — using an ephemeral dev secret.');
}

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './data/uploads');
const maxUploadMb = Math.min(intEnv('MAX_UPLOAD_MB', 2), 5);

// In production the database must be remote; refuse obvious local defaults.
const databaseUrl = process.env.DATABASE_URL || '';
if (isProd && /@localhost[:/]|@127\.0\.0\.1[:/]|@::1/.test(databaseUrl)) {
  throw new Error('Refusing to use a localhost database in production. Set DATABASE_URL to a remote PostgreSQL instance.');
}

const config = Object.freeze({
  env: nodeEnv,
  isProd,
  isTest,
  port: intEnv('PORT', 3000),
  appUrl,
  trustProxy,

  databaseUrl,

  sessionSecret,
  sessionTtlMs: intEnv('SESSION_TTL_HOURS', 12) * 60 * 60 * 1000,
  cookieName: isProd ? '__Host-sid' : 'sid',

  uploadDir,
  maxUploadBytes: maxUploadMb * 1024 * 1024,

  rateLimits: {
    global: { windowMs: intEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), max: intEnv('RATE_LIMIT_MAX', 300) },
    auth: { windowMs: intEnv('AUTH_RATE_WINDOW_MS', 15 * 60 * 1000), max: intEnv('AUTH_RATE_MAX', 10) },
    order: { windowMs: intEnv('ORDER_RATE_WINDOW_MS', 60 * 60 * 1000), max: intEnv('ORDER_RATE_MAX', 20) },
  },
});

module.exports = config;
