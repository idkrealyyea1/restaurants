'use strict';

/**
 * Shared pg connection pool + tiny transaction helper.
 */

const { Pool } = require('pg');
const config = require('../../config');

const pool = new Pool({
  ...config.dbConfig,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
  // Idle client errors would crash the process otherwise.
  console.error('[db] idle client error:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[db] rollback failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTx };
