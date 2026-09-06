'use strict';

/**
 * HTTP entrypoint. Listens on process.env.PORT (never hardcoded) and
 * shuts down gracefully so hosting platforms can redeploy safely.
 */

const config = require('./config');
const { buildApp } = require('./server/app');
const { pool } = require('./server/db/pool');

async function boot() {
  if (config.isProd) {
    try {
      const { migrate } = require('./database/migrate');
      await migrate();
      console.log('[migrate] up to date');
    } catch (err) {
      console.error('[migrate] failed:', err.message);
    }
  }
  const app = buildApp();
  const server = app.listen(config.port, () => {
    console.log(`[app] listening on port ${config.port} (${config.env})`);
  });

  function shutdown(signal) {
    console.log(`[app] ${signal} received — shutting down`);
    const force = setTimeout(() => process.exit(1), 10000);
    force.unref();
    server.close(async () => {
      try {
        await pool.end();
      } catch {
        /* already closed */
      }
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) boot();
