'use strict';

/**
 * Bootstrap the platform owner account from environment variables.
 * Safe to re-run: skips if the username already exists.
 *
 * Required env: SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD
 * Optional env: SUPER_ADMIN_EMAIL
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../../server/db/pool');

async function seedAdmin() {
  const username = (process.env.SUPER_ADMIN_USERNAME || '').trim();
  const email = (process.env.SUPER_ADMIN_EMAIL || '').trim() || null;
  const password = process.env.SUPER_ADMIN_PASSWORD || '';

  if (!username || !password) {
    throw new Error('SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD must be set.');
  }
  if (username.length < 3 || username.length > 40) {
    throw new Error('SUPER_ADMIN_USERNAME must be 3-40 characters.');
  }
  if (password.length < 10 || password.length > 200) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 10 characters.');
  }

  const hash = await bcrypt.hash(password, 12);

  const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  if (existing.rowCount > 0) {
    console.log(`Owner "${username}" already exists — nothing to do.`);
    return;
  }

  await pool.query(
    `INSERT INTO users (role, username, email, password_hash)
     VALUES ('owner', $1, $2, $3)`,
    [username, email, hash]
  );
  console.log(`Platform owner "${username}" created.`);
}

if (require.main === module) {
  seedAdmin()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { seedAdmin };
