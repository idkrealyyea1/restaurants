'use strict';

/**
 * Delivery groups — delivery businesses managed by the platform owner.
 * Restaurants choose which groups deliver their orders; the storefront shows
 * the chosen names on the checkout sheet for delivery orders.
 */

const { query, withTx } = require('../db/pool');
const { badRequest, notFound } = require('../utils/errors');

async function getById(id) {
  const { rows } = await query('SELECT * FROM delivery_groups WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listAll() {
  const { rows } = await query(
    `SELECT g.id, g.name, g.phone, g.notes, g.created_at AS "createdAt",
            COUNT(rd.group_id)::int AS "restaurantCount"
     FROM delivery_groups g
     LEFT JOIN restaurant_delivery_groups rd ON rd.group_id = g.id
     GROUP BY g.id
     ORDER BY g.created_at ASC`
  );
  return rows;
}

async function create({ name, phone, notes }) {
  const { rows } = await query(
    'INSERT INTO delivery_groups (name, phone, notes) VALUES ($1, $2, $3) RETURNING id, name, phone, notes',
    [name, phone || '', notes || '']
  );
  return rows[0];
}

async function rename(id, patch) {
  const sets = [];
  const params = [id];
  if (patch.name !== undefined) {
    params.push(patch.name);
    sets.push(`name = $${params.length}`);
  }
  if (patch.phone !== undefined) {
    params.push(patch.phone);
    sets.push(`phone = $${params.length}`);
  }
  if (patch.notes !== undefined) {
    params.push(patch.notes);
    sets.push(`notes = $${params.length}`);
  }
  if (sets.length === 0) return getById(id);
  const { rows } = await query(
    `UPDATE delivery_groups SET ${sets.join(', ')} WHERE id = $1 RETURNING id, name, phone, notes`,
    params
  );
  if (!rows[0]) throw notFound('Delivery group not found');
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM delivery_groups WHERE id = $1', [id]);
  if (!rowCount) throw notFound('Delivery group not found');
}

/** All groups with a `selected` flag for one restaurant. */
async function listForRestaurant(restaurantId) {
  const { rows } = await query(
    `SELECT g.id, g.name, g.phone,
            (rd.group_id IS NOT NULL) AS selected
     FROM delivery_groups g
     LEFT JOIN restaurant_delivery_groups rd
       ON rd.group_id = g.id AND rd.restaurant_id = $1
     ORDER BY g.created_at ASC`,
    [restaurantId]
  );
  return rows;
}

/** Replace a restaurant's selection atomically. */
async function setForRestaurant(restaurantId, groupIds) {
  if (groupIds.length > 0) {
    const { rows } = await query('SELECT id FROM delivery_groups WHERE id = ANY($1)', [groupIds]);
    const found = new Set(rows.map((r) => r.id));
    const missing = groupIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      const { badRequest } = require('../utils/errors');
      throw badRequest(`Unknown delivery group: ${missing[0]}`);
    }
  }
  await withTx(async (client) => {
    await client.query(
      'DELETE FROM restaurant_delivery_groups WHERE restaurant_id = $1',
      [restaurantId]
    );
    for (const gid of groupIds) {
      await client.query(
        `INSERT INTO restaurant_delivery_groups (restaurant_id, group_id)
         SELECT $1, id FROM delivery_groups WHERE id = $2`,
        [restaurantId, gid]
      );
    }
  });
  return listForRestaurant(restaurantId);
}

/** Names only — embedded into the public storefront view. */
async function namesForRestaurant(restaurantId) {
  const { rows } = await query(
    `SELECT g.name FROM delivery_groups g
     JOIN restaurant_delivery_groups rd ON rd.group_id = g.id
     WHERE rd.restaurant_id = $1
     ORDER BY g.created_at ASC`,
    [restaurantId]
  );
  return rows.map((r) => r.name);
}

/* ------------------------------------------------------------------ */
/* Delivery-company dashboard (scoped to the group's restaurants)      */
/* ------------------------------------------------------------------ */

/**
 * Delivery orders visible to a delivery company: every order of type
 * 'delivery' placed at a restaurant that has selected this group.
 */
async function listOrdersForGroup(deliveryGroupId, { status, limit, offset }) {
  const ALLOWED = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
  if (status && !ALLOWED.includes(status)) throw badRequest('Unknown order status');
  const params = [deliveryGroupId];
  let where = `o.order_type = 'delivery' AND o.archived_at IS NULL
    AND EXISTS (
      SELECT 1 FROM restaurant_delivery_groups rd
      WHERE rd.group_id = $1 AND rd.restaurant_id = o.restaurant_id
    )`;
  if (status) {
    params.push(status);
    where += ` AND o.status = $${params.length}`;
  }

  const count = await query(`SELECT COUNT(*)::int AS n FROM orders o WHERE ${where}`, params);
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT o.id, o.code, o.status, o.order_type, o.customer_name, o.customer_whatsapp,
            o.customer_phone, o.customer_address, o.notes,
            o.subtotal_cents, o.delivery_fee_cents, o.total_cents, o.created_at, o.updated_at,
            r.name AS restaurant_name, r.slug AS restaurant_slug,
            s.currency, s.timezone
     FROM orders o
     JOIN restaurants r ON r.id = o.restaurant_id
     JOIN restaurant_settings s ON s.restaurant_id = r.id
     WHERE ${where}
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { total: count.rows[0].n, orders: rows };
}

/** Confirm an order actually belongs to a restaurant this group delivers for. */
async function orderDeliveredWithinGroup(deliveryGroupId, orderId) {
  const { rows } = await query(
    `SELECT 1 FROM orders o
     WHERE o.id = $1 AND o.order_type = 'delivery'
       AND EXISTS (
         SELECT 1 FROM restaurant_delivery_groups rd
         WHERE rd.group_id = $2 AND rd.restaurant_id = o.restaurant_id
       )`,
    [orderId, deliveryGroupId]
  );
  return rows.length > 0;
}

/** Advance a delivery order to the next delivery stage (scoped to group). */
async function updateOrderStatus(deliveryGroupId, orderId, nextStatus) {
  if (!['out_for_delivery', 'completed'].includes(nextStatus)) {
    const { badRequest } = require('../utils/errors');
    throw badRequest('Delivery staff may only mark orders ready/out for delivery or completed');
  }
  if (!(await orderDeliveredWithinGroup(deliveryGroupId, orderId))) {
    throw notFound('Order not found');
  }
  const { rows } = await query(
    `UPDATE orders SET status = $2, updated_at = now()
     WHERE id = $1
       AND status <> $2
       AND status IN ('ready', 'out_for_delivery')
     RETURNING id, code, status`,
    [orderId, nextStatus]
  );
  if (!rows[0]) {
    const cur = (await query('SELECT status FROM orders WHERE id = $1', [orderId])).rows[0];
    if (!cur) throw notFound('Order not found');
    const { conflict } = require('../utils/errors');
    throw conflict('INVALID_STATUS_TRANSITION', `Delivery status change to "${nextStatus}" is not allowed from "${cur.status}"`);
  }
  return rows[0];
}

module.exports = {
  getById,
  listAll, create, rename, remove, listForRestaurant, setForRestaurant, namesForRestaurant,
  listOrdersForGroup, updateOrderStatus,
};
