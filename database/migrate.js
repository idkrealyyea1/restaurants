'use strict';

/**
 * Minimal SQL migration runner.
 * Applies files from database/migrations in filename order, tracking them
 * in schema_migrations. Idempotent: already-applied files are skipped.
 *
 * Usage: DATABASE_URL=... node database/migrate.js
 */

const fs = require('fs');
const path = require('path');

const config = require('../config');
const { pool } = require('../server/db/pool');

async function migrate(databaseUrlOverride) {
  const dir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');

    const applied = new Set(
      (await client.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
    );

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`apply ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
    console.log('Migrations up to date.');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { migrate };
