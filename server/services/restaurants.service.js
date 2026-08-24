'use strict';

/**
 * Restaurant (tenant) data access + public view assembly.
 */

const { query, withTx } = require('../db/pool');
const { conflict, notFound } = require('../utils/errors');
const { isOpenNow, timeToHhmm } = require('../utils/datetime');

async function slugExists(slug) {
  const { rowCount } = await query('SELECT 1 FROM restaurants WHERE slug = $1', [slug]);
  return rowCount > 0;
}

/** Create tenant + default settings + 7 default hour rows in one transaction. */
async function createRestaurant({ name, slug, maxMenuItems }) {
  return withTx(async (client) => {
    // Serialize on slug uniqueness explicitly for a clean error message.
    const dupe = await client.query('SELECT 1 FROM restaurants WHERE slug = $1', [slug]);
    if (dupe.rowCount > 0) throw conflict('SLUG_TAKEN', 'A restaurant with this URL slug already exists');

    const { rows } = await client.query(
      `INSERT INTO restaurants (name, slug, max_menu_items)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, slug, maxMenuItems]
    );
    const restaurant = rows[0];
    await client.query(
      'INSERT INTO restaurant_settings (restaurant_id) VALUES ($1)',
      [restaurant.id]
    );
    for (let day = 0; day < 7; day++) {
      await client.query(
        'INSERT INTO restaurant_hours (restaurant_id, day_of_week) VALUES ($1, $2)',
        [restaurant.id, day]
      );
    }
    return restaurant;
  });
}

async function updateRestaurant(id, patch) {
  const sets = [];
  const params = [id];
  if (patch.name !== undefined) {
    params.push(patch.name);
    sets.push(`name = $${params.length}`);
  }
  if (patch.slug !== undefined) {
    params.push(patch.slug);
    sets.push(`slug = $${params.length}`);
  }
  if (patch.maxMenuItems !== undefined) {
    params.push(patch.maxMenuItems);
    sets.push(`max_menu_items = $${params.length}`);
  }
  if (patch.isActive !== undefined) {
    params.push(patch.isActive);
    sets.push(`is_active = $${params.length}`);
  }
  if (patch.status !== undefined) {
    params.push(patch.status);
    sets.push(`status = $${params.length}`);
  }
  if (sets.length === 0) return getById(id);

  try {
    const { rows } = await query(
      `UPDATE restaurants SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return rows[0] || null;
  } catch (err) {
    if (err.code === '23505') throw conflict('SLUG_TAKEN', 'A restaurant with this URL slug already exists');
    throw err;
  }
}

async function deleteById(id) {
  const { rowCount } = await query('DELETE FROM restaurants WHERE id = $1', [id]);
  return rowCount > 0;
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM restaurants WHERE id = $1', [id]);
  return rows[0] || null;
}

async function getBySlug(slug) {
  const { rows } = await query('SELECT * FROM restaurants WHERE slug = $1', [slug]);
  return rows[0] || null;
}

async function getSettings(restaurantId) {
  const { rows } = await query('SELECT * FROM restaurant_settings WHERE restaurant_id = $1', [restaurantId]);
  return rows[0] || null;
}

async function getHours(restaurantId) {
  const { rows } = await query(
    'SELECT day_of_week, is_closed, opens_at, closes_at FROM restaurant_hours WHERE restaurant_id = $1 ORDER BY day_of_week',
    [restaurantId]
  );
  return rows;
}

/**
 * Public storefront payload: everything a customer's browser may see.
 * Never exposes owner-only fields (max_menu_items, is_active internals).
 */
async function getPublicView(slug) {
  const restaurant = await getBySlug(slug);
  if (!restaurant || !restaurant.is_active) return null;

  const settings = await getSettings(restaurant.id);
  const hours = await getHours(restaurant.id);

  const categories = (
    await query(
      'SELECT id, name, position FROM categories WHERE restaurant_id = $1 ORDER BY position, name',
      [restaurant.id]
    )
  ).rows;

  const items = (
    await query(
      `SELECT id, category_id, name, description, price_cents, image_path,
              is_available, is_popular
       FROM menu_items WHERE restaurant_id = $1
       ORDER BY position, created_at`,
      [restaurant.id]
    )
  ).rows;

  const openNow =
    restaurant.status === 'open' &&
    (settings.ignore_opening_hours || isOpenNow(hours, settings.timezone));

  return {
    name: restaurant.name,
    slug: restaurant.slug,
    status: restaurant.is_active ? restaurant.status : 'closed',
    openNow,
    settings: {
      description: settings.description,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      address: settings.address,
      logoPath: settings.logo_path,
      coverPath: settings.cover_path,
      primaryColor: settings.primary_color,
      secondaryColor: settings.secondary_color,
      currency: settings.currency.toUpperCase(),
      deliveryFeeCents: settings.delivery_fee_cents,
    },
    hours: hours.map((h) => ({
      day: h.day_of_week,
      closed: h.is_closed,
      opensAt: timeToHhmm(h.opens_at),
      closesAt: timeToHhmm(h.closes_at),
    })),
    categories,
    items,
  };
}

async function countItems(restaurantId) {
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM menu_items WHERE restaurant_id = $1', [restaurantId]);
  return rows[0].n;
}

/**
 * Platform-owner listing with search + filters + item usage.
 */
async function listForOwner({ search, status, limit, offset }) {
  const params = [];
  let where = 'TRUE';

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where += ` AND (LOWER(r.name) LIKE $${params.length} OR r.slug LIKE $${params.length})`;
  }
  if (status === 'active') where += ' AND r.is_active = TRUE';
  if (status === 'inactive') where += ' AND r.is_active = FALSE';

  const countRes = await query(`SELECT COUNT(*)::int AS n FROM restaurants r WHERE ${where}`, params);

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT r.id, r.slug, r.name, r.status, r.is_active, r.max_menu_items, r.created_at,
            COALESCE(items.n, 0)::int AS item_count
     FROM restaurants r
     LEFT JOIN (SELECT restaurant_id, COUNT(*) AS n FROM menu_items GROUP BY restaurant_id) items
       ON items.restaurant_id = r.id
     WHERE ${where}
     ORDER BY r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { total: countRes.rows[0].n, restaurants: rows };
}

/** Aggregate stats shown on one restaurant's owner detail card. */
async function ownerStats(restaurantId) {
  const itemCount = await countItems(restaurantId);
  const orders7 = await query(
    `SELECT COUNT(*)::int AS n, COALESCE(SUM(total_cents), 0)::bigint AS revenue_cents
     FROM orders
     WHERE restaurant_id = $1 AND created_at >= now() - INTERVAL '7 days'
       AND status <> 'cancelled'`,
    [restaurantId]
  );
  const pending = await query(
    `SELECT COUNT(*)::int AS n FROM orders WHERE restaurant_id = $1 AND status = 'pending'`,
    [restaurantId]
  );
  return {
    itemCount,
    ordersLast7d: orders7.rows[0].n,
    revenueLast7dCents: Number(orders7.rows[0].revenue_cents),
    pendingOrders: pending.rows[0].n,
  };
}

/** Platform-wide overview numbers. */
async function platformOverview() {
  const res = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM restaurants) AS restaurants_total,
       (SELECT COUNT(*)::int FROM restaurants WHERE is_active) AS restaurants_active,
       (SELECT COUNT(*)::int FROM orders WHERE created_at >= date_trunc('day', now())) AS orders_today,
       (SELECT COALESCE(SUM(total_cents), 0)::bigint FROM orders
          WHERE created_at >= date_trunc('day', now()) AND status <> 'cancelled') AS revenue_today_cents`
  );
  const row = res.rows[0];
  return {
    restaurantsTotal: row.restaurants_total,
    restaurantsActive: row.restaurants_active,
    ordersToday: row.orders_today,
    revenueTodayCents: Number(row.revenue_today_cents),
  };
}

async function assertExists(id) {
  const row = await getById(id);
  if (!row) throw notFound('Restaurant not found');
  return row;
}

module.exports = {
  slugExists,
  createRestaurant,
  updateRestaurant,
  deleteById,
  getById,
  assertExists,
  getBySlug,
  getSettings,
  getHours,
  getPublicView,
  countItems,
  listForOwner,
  ownerStats,
  platformOverview,
};
