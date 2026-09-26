'use strict';

/**
 * Persistent per-user order notifications (005, D1).
 * The database row is the source of truth; real-time events are only hints.
 */

const { query } = require('../db/pool');
const { notFound } = require('../utils/errors');

/**
 * Recipient sets for a committed order. Staff excluded (no restaurant scope);
 * deactivated users excluded (their sessions are revoked anyway).
 */
async function restaurantRecipients(client, restaurantId) {
  const { rows } = await client.query(
    `SELECT id FROM users
     WHERE restaurant_id = $1 AND role = 'admin' AND is_active = TRUE`,
    [restaurantId]
  );
  return rows.map((r) => r.id);
}

async function platformRecipients(client) {
  const { rows } = await client.query(
    `SELECT id FROM users WHERE role = 'owner' AND is_active = TRUE`
  );
  return rows.map((r) => r.id);
}

/**
 * Insert one row per recipient inside the caller's transaction (atomic with
 * the order commit — see orders.service.js createCheckout).
 */
async function fanOut(client, { orderId, restaurantId, title, body }) {
  const admins = await restaurantRecipients(client, restaurantId);
  const owners = await platformRecipients(client);
  const recipients = [...new Set([...admins, ...owners])];
  for (const userId of recipients) {
    await client.query(
      `INSERT INTO notifications (recipient_user_id, restaurant_id, order_id, title, body)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, restaurantId, orderId, title, body]
    );
  }
  return recipients.length;
}

async function listForUser(userId, { limit = 25, offset = 0 } = {}) {
  const count = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_read = FALSE)::int AS unread
     FROM notifications WHERE recipient_user_id = $1`,
    [userId]
  );
  const { rows } = await query(
    `SELECT n.id, n.order_id, o.code AS order_code, n.restaurant_id,
            r.name AS restaurant_name, r.slug AS restaurant_slug,
            n.type, n.title, n.body, n.is_read, n.created_at
     FROM notifications n
     JOIN orders o ON o.id = n.order_id
     LEFT JOIN restaurants r ON r.id = n.restaurant_id
     WHERE n.recipient_user_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return { notifications: rows, unreadCount: count.rows[0].unread, total: count.rows[0].total };
}

async function markRead(userId, notificationId, restaurantId = null) {
  const params = [notificationId, userId];
  let where = 'id = $1 AND recipient_user_id = $2';
  if (restaurantId) {
    params.push(restaurantId);
    where += ' AND restaurant_id = $3';
  }
  const { rows } = await query(
    `UPDATE notifications SET is_read = TRUE WHERE ${where} RETURNING id`,
    params
  );
  if (!rows[0]) throw notFound('Notification not found');
  return rows[0];
}

module.exports = { restaurantRecipients, platformRecipients, fanOut, listForUser, markRead };
