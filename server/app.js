'use strict';

/**
 * Express application assembly. Exported for tests; server.js boots it.
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const expressSession = require('express-session');
const pgSession = require('connect-pg-simple');

const config = require('../config');
const { pool } = require('./db/pool');
const { originGuard } = require('./middleware/csrf');
const { globalLimiter } = require('./middleware/ratelimit');
const { attachUser } = require('./middleware/auth');
const { errorHandler, notFoundHandler, notFound, asyncHandler } = require('./utils/errors');
const files = require('./services/files.service');

const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');
const ownerRoutes = require('./routes/owner.routes');
const deliveryRoutes = require('./routes/delivery.routes');

const CLIENT_DIR = path.join(__dirname, '..', 'client');

function buildApp() {
  const app = express();

  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  /* ------------------------- security headers ------------------------- */
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          ...(config.isProd ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      hsts: config.isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  /* --------------------------- body parsing ---------------------------- */
  app.use(express.json({ limit: '64kb' }));

  /* ------------------------------ CSRF -------------------------------- */
  app.use(originGuard);

  /* ------------------------ static assets ----------------------------- */
  // Served before sessions so browsers never receive session cookies for assets.
  app.use(
    express.static(CLIENT_DIR, {
      index: 'index.html',
      maxAge: config.isProd ? '1h' : 0,
      extensions: ['html'],
    })
  );
  /* Uploaded images live in PostgreSQL (survive redeploys/restarts). */
  app.get(
    '/uploads/:subdir/:filename',
    asyncHandler(async (req, res) => {
      const publicPath = `/uploads/${req.params.subdir}/${req.params.filename}`;
      if (!files.PUBLIC_PATH_RE.test(publicPath)) throw notFound('Not found');
      const row = await files.get(publicPath);
      if (!row) throw notFound('Not found');
      res.set('Content-Type', row.mime);
      res.set('Cache-Control', 'public, max-age=2592000');
      res.set('Content-Length', String(row.bytes.length));
      res.end(row.bytes);
    })
  );

  /* ----------------------------- session ------------------------------ */
  const PgStore = pgSession(expressSession);
  app.use(
    expressSession({
      name: config.cookieName,
      store: new PgStore({
        pool,
        tableName: 'session',
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 60,
      }),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      proxy: config.trustProxy >= 1,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
        maxAge: config.sessionTtlMs,
        path: '/',
      },
    })
  );

  /* --------------------- authenticated request context ------------------ */
  app.use(attachUser);

  /* ------------------------------- pages ------------------------------- */
  app.get('/restaurant/:slug', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'restaurant.html'));
  });
  app.get('/track', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'track.html'));
  });
  app.get('/delivery', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'delivery.html'));
  });

  /* ------------------------- PWA (manifest/SW) ------------------------- */
  app.get('/manifest.webmanifest', (req, res) => {
    res.set('Content-Type', 'application/manifest+json; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(CLIENT_DIR, 'manifest.webmanifest'));
  });
  app.get('/sw.js', (req, res) => {
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(CLIENT_DIR, 'sw.js'));
  });

  /* -------------------------------- API -------------------------------- */
  app.use('/api', globalLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/owner', ownerRoutes);
  app.use('/api/delivery', deliveryRoutes);
  app.use('/api', publicRoutes);

  /* -------------------------- error handling ---------------------------- */
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
