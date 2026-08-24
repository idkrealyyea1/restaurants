'use strict';

const bcrypt = require('bcryptjs');
const { query, withTx } = require('../db/pool');

const BCRYPT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function publicUser(row) {
  return {
    id: row.id,
    role: row.role,
    username: row.username,
    email: row.email || null,
    restaurantId: row.restaurant_id || null,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByIdentifier(identifier) {
  const { rows } = await query(
    `SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND LOWER(email) = LOWER($1)) LIMIT 1`,
    [identifier]
  );
  return rows[0] || null;
}

/**
 * Create a restaurant administrator account (platform owner only).
 */
async function createAdmin({ restaurantId, username, email, password }) {
  const hash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (role, restaurant_id, username, email, password_hash)
     VALUES ('admin', $1, $2, $3, $4)
     RETURNING id, role, username, email, restaurant_id, is_active, created_at`,
    [restaurantId, username, email || null, hash]
  );
  return publicUser(rows[0]);
}

async function setPassword(userId, plainPassword) {
  const hash = await hashPassword(plainPassword);
  await withTx(async (client) => {
    await client.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, hash]);
    // Revoke every existing session of that user immediately.
    await client.query(`DELETE FROM "session" WHERE sess->>'userId' = $1`, [userId]);
  });
}

async function setIsActive(userId, isActive) {
  await withTx(async (client) => {
    const { rowCount } = await client.query(
      'UPDATE users SET is_active = $2 WHERE id = $1 AND role = $3',
      [userId, isActive, 'admin']
    );
    if (rowCount === 0) return null;
    if (!isActive) {
      await client.query(`DELETE FROM "session" WHERE sess->>'userId' = $1`, [userId]);
    }
    return true;
  });
}

async function deleteAdmin(userId) {
  const { rowCount } = await query(`DELETE FROM users WHERE id = $1 AND role = 'admin'`, [userId]);
  return rowCount > 0;
}

async function listAdminsForRestaurant(restaurantId) {
  const { rows } = await query(
    `SELECT id, username, email, is_active, created_at FROM users
     WHERE role = 'admin' AND restaurant_id = $1 ORDER BY created_at ASC`,
    [restaurantId]
  );
  return rows;
}

module.exports = {
  hashPassword,
  verifyPassword,
  publicUser,
  findById,
  findByIdentifier,
  createAdmin,
  setPassword,
  setIsActive,
  deleteAdmin,
  listAdminsForRestaurant,
};
