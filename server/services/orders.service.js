'use strict';

/**
 * Orders — server-priced checkout, tenant-scoped management,
 * status transitions and analytics. Prices ALWAYS come from the database
 * at purchase time; anything sent by the browser about money is ignored.
 */

const { query, withTx } = require('../db/pool');
const { badRequest, conflict, notFound } = require('../utils/errors');
const { orderCode } = require('../utils/ids');
const { isOpenNow } = require('../utils/datetime');

const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];

const TRANSITIONS = {
  pending: ['confirmed', 'preparing', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed', 'cancelled'],
  out_for_delivery: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function assertTransition(current, next, orderType) {
  if (!STATUSES.includes(next)) throw badRequest('Unknown order status');
  const allowed = TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw conflict('INVALID_STATUS_TRANSITION', `Cannot change status from "${current}" to "${next}"`);
  }
  if (next === 'out_for_delivery' && orderType !== 'delivery') {
    throw badRequest('"Out for delivery" only applies to delivery orders');
  }
}

/* ------------------------------------------------------------------ */
/* Checkout                                                            */
/* ------------------------------------------------------------------ */

/**
 * payload: {
 *   customerName, customerWhatsapp, customerPhone?, customerAddress?,
 *   orderType: 'pickup'|'delivery', notes?,
 *   items: [{ itemId, quantity }]
 * }
 */
async function createCheckout({ restaurantId, payload }) {
  return withTx(async (client) => {
    // Lock the tenant row: prevents status flips mid-checkout and serializes
    // concurrent checkouts for this restaurant.
    const restRes = await client.query(
      `SELECT r.id, r.is_active, r.status,
              s.timezone, s.delivery_fee_cents, s.ignore_opening_hours
       FROM restaurants r
       JOIN restaurant_settings s ON s.restaurant_id = r.id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [restaurantId]
    );
    const rest = restRes.rows[0];
    if (!rest || !rest.is_active) throw conflict('RESTAURANT_UNAVAILABLE', 'This restaurant is not accepting orders');

    if (rest.status !== 'open') {
      throw conflict('RESTAURANT_CLOSED', 'This restaurant is currently closed and not accepting new orders');
    }

    if (!rest.ignore_opening_hours) {
      const hours = (
        await client.query(
          'SELECT day_of_week, is_closed, opens_at, closes_at FROM restaurant_hours WHERE restaurant_id = $1',
          [restaurantId]
        )
      ).rows;
      if (!isOpenNow(hours, rest.timezone)) {
        throw conflict(
          'OUTSIDE_OPENING_HOURS',
          'This restaurant is outside its opening hours right now. Please come back later.'
        );
      }
    }

    // Merge duplicate item entries, enforce sane bounds.
    const wanted = new Map();
    let totalUnits = 0;
    for (const line of payload.items) {
      const id = String(line.itemId).toLowerCase();
      const qty = line.quantity;
      const merged = (wanted.get(id) || 0) + qty;
      if (merged > 99) throw badRequest('Quantity too high for one of the items');
      wanted.set(id, merged);
      totalUnits += merged;
      if (totalUnits > 200) throw badRequest('Too many items in a single order');
    }

    // Prices & availability from DB only.
    const itemRes = await client.query(
      `SELECT id, name, price_cents FROM menu_items
       WHERE restaurant_id = $1 AND is_available = TRUE AND id = ANY($2::uuid[])`,
      [restaurantId, [...wanted.keys()]]
    );
    if (itemRes.rowCount !== wanted.size) {
      throw conflict('ITEMS_UNAVAILABLE', 'One or more items are no longer available. Please refresh the menu.');
    }

    const lines = [];
    let subtotal = 0;
    for (const row of itemRes.rows) {
      const qty = wanted.get(row.id);
      const lineTotal = row.price_cents * qty;
      subtotal += lineTotal;
      lines.push({
        menuItemId: row.id,
        itemName: row.name,
        unitPriceCents: row.price_cents,
        quantity: qty,
        lineTotalCents: lineTotal,
      });
    }

    const deliveryFee =
      payload.orderType === 'delivery' ? Number(rest.delivery_fee_cents || 0) : 0;
    const total = subtotal + deliveryFee;

    // Insert with collision-resistant public code (retry on rare clash).
    let orderRow = null;
    for (let attempt = 0; attempt < 5 && !orderRow; attempt++) {
      try {
        const res = await client.query(
          `INSERT INTO orders
             (code, restaurant_id, customer_name, customer_whatsapp, customer_phone,
              customer_address, order_type, notes, subtotal_cents, delivery_fee_cents, total_cents)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING id, code, status, total_cents, created_at`,
          [
            orderCode(),
            restaurantId,
            payload.customerName,
            payload.customerWhatsapp,
            payload.customerPhone,
            payload.customerAddress,
            payload.orderType,
            payload.notes,
            subtotal,
            deliveryFee,
            total,
          ]
        );
        orderRow = res.rows[0];
      } catch (err) {
        if (err.code === '23505') continue; // code collision — retry
        throw err;
      }
    }

    for (const line of lines) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price_cents, quantity, line_total_cents)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderRow.id, line.menuItemId, line.itemName, line.unitPriceCents, line.quantity, line.lineTotalCents]
      );
    }

    return orderRow;
  });
}

/* ------------------------------------------------------------------ */
/* Restaurant-admin views                                              */
/* ------------------------------------------------------------------ */

async function listForRestaurant(restaurantId, { status, limit, offset }) {
  const params = [restaurantId];
  let where = 'restaurant_id = $1';
  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }

  const count = await query(`SELECT COUNT(*)::int AS n FROM orders WHERE ${where}`, params);

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT o.*, COUNT(oi.id)::int AS item_line_count,
            COALESCE(SUM(oi.quantity), 0)::int AS total_units
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE ${where}
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { total: count.rows[0].n, orders: rows };
}

async function getForRestaurant(orderId, restaurantId) {
  const order = (
    await query('SELECT * FROM orders WHERE id = $1 AND restaurant_id = $2', [orderId, restaurantId])
  ).rows[0];
  if (!order) throw notFound('Order not found');
  order.items = (
    await query(
      `SELECT id, menu_item_id, item_name, unit_price_cents, quantity, line_total_cents
       FROM order_items WHERE order_id = $1 ORDER BY created_at`,
      [orderId]
    )
  ).rows;
  return order;
}

async function updateStatus(orderId, restaurantId, nextStatus) {
  return withTx(async (client) => {
    const { rows } = await client.query(
      `UPDATE orders SET status = $3
       WHERE id = $1 AND restaurant_id = $2 AND status <> $3
       RETURNING id, code, status`,
      [orderId, restaurantId, nextStatus]
    );
    if (!rows[0]) {
      const existing = (
        await client.query(
          'SELECT status FROM orders WHERE id = $1 AND restaurant_id = $2',
          [orderId, restaurantId]
        )
      ).rows[0];
      if (!existing) throw notFound('Order not found');
      throw conflict('SAME_STATUS', `Order status is already "${existing.status}"`);
    }
    return rows[0];
  });
}

/** Validate then apply a status change (public helper used by controller). */
async function changeStatus(orderId, restaurantId, nextStatus) {
  const current = (
    await query('SELECT status, order_type FROM orders WHERE id = $1 AND restaurant_id = $2', [orderId, restaurantId])
  ).rows[0];
  if (!current) throw notFound('Order not found');
  assertTransition(current.status, nextStatus, current.order_type);
  return updateStatus(orderId, restaurantId, nextStatus);
}

/* ------------------------------------------------------------------ */
/* Dashboard + analytics                                               */
/* ------------------------------------------------------------------ */

async function dashboardCounts(restaurantId, timezone) {
  const res = await query(
    `SELECT
       COUNT(*) FILTER (WHERE (created_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date)::int AS orders_today,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE status IN ('confirmed','preparing','ready','out_for_delivery'))::int AS active_orders,
       COUNT(*) FILTER (WHERE status = 'completed' AND (updated_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date)::int AS completed_today,
       COALESCE(SUM(total_cents) FILTER (
         WHERE status <> 'cancelled' AND (created_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date
       ), 0)::bigint AS revenue_today_cents
     FROM orders
     WHERE restaurant_id = $1`,
    [restaurantId, timezone]
  );
  const r = res.rows[0];
  return {
    ordersToday: r.orders_today,
    pendingOrders: r.pending,
    activeOrders: r.active_orders,
    completedToday: r.completed_today,
    revenueTodayCents: Number(r.revenue_today_cents),
  };
}

async function analyticsSeries(restaurantId, timezone, days) {
  const res = await query(
    `SELECT to_char((created_at AT TIME ZONE $2)::date, 'YYYY-MM-DD') AS day,
            COUNT(*)::int AS orders,
            COALESCE(SUM(total_cents), 0)::bigint AS revenue_cents
     FROM orders
     WHERE restaurant_id = $1 AND status <> 'cancelled'
       AND (created_at AT TIME ZONE $2) >= date_trunc('day', now() AT TIME ZONE $2) - ($3::int - 1)
     GROUP BY 1
     ORDER BY 1`,
    [restaurantId, timezone, days]
  );

  // Fill zero-days so charts are continuous.
  const byDay = new Map(res.rows.map((r) => [r.day, r]));
  const series = [];
  const cursor = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cursor.getTime() - i * 86400000);
    // Label using the restaurant's timezone.
    const label = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
    const hit = byDay.get(label);
    series.push({
      day: label,
      orders: hit ? hit.orders : 0,
      revenueCents: hit ? Number(hit.revenue_cents) : 0,
    });
  }

  const totals = series.reduce(
    (acc, s) => ({ orders: acc.orders + s.orders, revenueCents: acc.revenueCents + s.revenueCents }),
    { orders: 0, revenueCents: 0 }
  );
  return { series, totals };
}

async function topItems(restaurantId, days = 30, limit = 10) {
  const { rows } = await query(
    `SELECT oi.item_name, SUM(oi.quantity)::int AS units, COALESCE(SUM(oi.line_total_cents),0)::bigint AS revenue_cents
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.restaurant_id = $1 AND o.status <> 'cancelled'
       AND o.created_at >= now() - ($2::int * INTERVAL '1 day')
     GROUP BY oi.item_name
     ORDER BY units DESC
     LIMIT $3`,
    [restaurantId, days, limit]
  );
  return rows.map((r) => ({ ...r, revenueCents: Number(r.revenue_cents) }));
}

/* ------------------------------------------------------------------ */
/* Customer tracking                                                   */
/* ------------------------------------------------------------------ */

async function getByCode(code) {
  const order = (
    await query(
      `SELECT o.id, o.code, o.status, o.order_type, o.total_cents, o.subtotal_cents, o.delivery_fee_cents,
              o.created_at, o.updated_at, r.name AS restaurant_name, r.slug AS restaurant_slug,
              s.currency
       FROM orders o
       JOIN restaurants r ON r.id = o.restaurant_id
       JOIN restaurant_settings s ON s.restaurant_id = r.id
       WHERE UPPER(o.code) = UPPER($1)`,
      [code]
    )
  ).rows[0];
  if (!order) throw notFound('No order found for this tracking code');

  order.items = (
    await query(
      'SELECT item_name, unit_price_cents, quantity, line_total_cents FROM order_items WHERE order_id = $1 ORDER BY created_at',
      [order.id]
    )
  ).rows;
  delete order.id;
  return order;
}

module.exports = {
  STATUSES,
  TRANSITIONS,
  createCheckout,
  listForRestaurant,
  getForRestaurant,
  changeStatus,
  dashboardCounts,
  analyticsSeries,
  topItems,
  getByCode,
};
