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
const { errorHandler, notFoundHandler } = require('./utils/errors');

const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');
const ownerRoutes = require('./routes/owner.routes');

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
  app.use(
    '/uploads',
    express.static(config.uploadDir, {
      maxAge: '7d',
      index: false,
      dotfiles: 'ignore',
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

  /* -------------------------------- API -------------------------------- */
  app.use('/api', globalLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/owner', ownerRoutes);
  app.use('/api', publicRoutes);

  /* -------------------------- error handling ---------------------------- */
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
