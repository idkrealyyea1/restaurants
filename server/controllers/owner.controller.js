'use strict';

/**
 * Platform-owner controller: tenant management, admin accounts,
 * platform-wide monitoring. All handlers require role='owner'.
 */

const crypto = require('crypto');
const restaurants = require('../services/restaurants.service');
const users = require('../services/users.service');
const ordersService = require('../services/orders.service');
const settingsService = require('../services/settings.service');
const { normalizeSlug } = require('../utils/checks');
const { conflict, notFound, badRequest } = require('../utils/errors');
const { assertUuid } = require('../utils/checks');
const { asyncHandler } = require('../utils/errors');
const v = require('../validators');

async function overview(req, res) {
  res.json(await restaurants.platformOverview());
}

async function listRestaurants(req, res) {
  const page = v.validatePagination(req.query);
  const search = req.query.search ? String(req.query.search).slice(0, 80) : null;
  const status = ['active', 'inactive'].includes(req.query.status) ? req.query.status : null;

  const { total, restaurants: rows } = await restaurants.listForOwner({
    search,
    status,
    limit: page.limit,
    offset: page.offset,
  });

  res.json({
    total,
    page: page.page,
    limit: page.limit,
    restaurants: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      isActive: r.is_active,
      maxMenuItems: r.max_menu_items,
      itemCount: r.item_count,
      createdAt: r.created_at,
    })),
  });
}

async function createRestaurant(req, res) {
  const data = v.validateRestaurantCreate(req.body);
  if (data.slug === undefined) {
    data.slug = normalizeSlug(data.name); // derive from name
  }
  if (await restaurants.slugExists(data.slug)) {
    throw conflict('SLUG_TAKEN', 'A restaurant with this URL slug already exists');
  }
  const restaurant = await restaurants.createRestaurant(data);

  // Optionally create the first admin account in the same request.
  let admin = null;
  let generatedPassword;
  if (req.body.adminUsername) {
    const username = v.validateUsername(req.body.adminUsername);
    const email = v.validateEmailOptional(req.body.adminEmail);
    let password = req.body.adminPassword;
    if (password === undefined || password === '') {
      generatedPassword = crypto.randomBytes(12).toString('base64url');
      password = generatedPassword;
    } else {
      password = v.validatePassword(password);
    }
    admin = await users.createAdmin({ restaurantId: restaurant.id, username, email, password });
  }

  res.status(201).json({
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      status: restaurant.status,
      isActive: restaurant.is_active,
      maxMenuItems: restaurant.max_menu_items,
      createdAt: restaurant.created_at,
    },
    ...(admin
      ? {
          admin: {
            id: admin.id,
            username: admin.username,
            // Echoed only when the server generated it (shown once):
            generatedPassword,
          },
        }
      : {}),
  });
}

async function getRestaurant(req, res) {
  const id = assertUuid(req.params.id, 'id');
  const restaurant = await restaurants.getById(id);
  if (!restaurant) throw notFound('Restaurant not found');

  res.json({
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      status: restaurant.status,
      isActive: restaurant.is_active,
      maxMenuItems: restaurant.max_menu_items,
      createdAt: restaurant.created_at,
      settings: await restaurants.getSettings(id),
    },
    stats: await restaurants.ownerStats(id),
    admins: await users.listAdminsForRestaurant(id),
  });
}

/** Owner update: identity/limits/activation here; colors proxied to settings. */
async function updateRestaurant(req, res) {
  const id = assertUuid(req.params.id, 'id');
  await restaurants.assertExists(id);
  const patch = v.validateRestaurantUpdate(req.body);

  const colorKeys = ['primaryColor', 'secondaryColor'];
  const restPatch = {};
  const settingsPatch = {};
  for (const [k, val] of Object.entries(patch)) {
    if (colorKeys.includes(k)) settingsPatch[k] = val;
    else restPatch[k] = val;
  }

  let updated = null;
  if (Object.keys(restPatch).length > 0) {
    updated = await restaurants.updateRestaurant(id, restPatch);
  }
  if (Object.keys(settingsPatch).length > 0) {
    await require('../services/settings.service').updateOwned(id, settingsPatch);
  }

  if (!updated) updated = await restaurants.getById(id);
  res.json({
    restaurant: {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      status: updated.status,
      isActive: updated.is_active,
      maxMenuItems: updated.max_menu_items,
    },
  });
}

async function deleteRestaurant(req, res) {
  const id = assertUuid(req.params.id, 'id');
  const ok = await restaurants.deleteById(id);
  if (!ok) throw notFound('Restaurant not found');
  res.json({ ok: true });
}

/* --------------------- restaurant admins ------------------------- */

function requireOwnedAdmin(req) {
  const userId = assertUuid(req.params.userId, 'userId');
  return userId;
}

async function createAdminUser(req, res) {
  const restaurantId = assertUuid(req.params.id, 'id');
  await restaurants.assertExists(restaurantId);

  const username = v.validateUsername(req.body.username);
  const email = v.validateEmailOptional(req.body.email);
  const password = v.validatePassword(req.body.password);
  const admin = await users.createAdmin({ restaurantId, username, email, password });
  res.status(201).json({ admin });
}

/** Reset an admin's password. Generates one when none is provided. */
async function resetAdminPassword(req, res) {
  const restaurantId = assertUuid(req.params.id, 'id');
  const userId = requireOwnedAdmin(req);

  // Ensure the target account belongs to this restaurant.
  const target = await users.findById(userId);
  if (!target || target.role !== 'admin' || target.restaurant_id !== restaurantId) {
    throw notFound('Admin account not found for this restaurant');
  }

  const generated = !req.body.password;
  const password = generated
    ? crypto.randomBytes(12).toString('base64url')
    : v.validatePassword(req.body.password);

  await users.setPassword(userId, password);
  res.json({ ok: true, ...(generated ? { password } : {}) });
}

async function toggleAdminActive(req, res) {
  const restaurantId = assertUuid(req.params.id, 'id');
  const userId = requireOwnedAdmin(req);
  const active = req.body.isActive;

  const target = await users.findById(userId);
  if (!target || target.role !== 'admin' || target.restaurant_id !== restaurantId) {
    throw notFound('Admin account not found for this restaurant');
  }

  const result = await users.setIsActive(userId, Boolean(active));
  if (!result) throw badRequest('Nothing changed');
  res.json({ ok: true, isActive: Boolean(active) });
}

async function deleteAdminUser(req, res) {
  const restaurantId = assertUuid(req.params.id, 'id');
  const userId = requireOwnedAdmin(req);

  const target = await users.findById(userId);
  if (!target || target.role !== 'admin' || target.restaurant_id !== restaurantId) {
    throw notFound('Admin account not found for this restaurant');
  }
  await users.deleteAdmin(userId);
  res.json({ ok: true });
}

/* --------------------------- orders view -------------------------- */

async function listOrdersForRestaurant(req, res) {
  const id = assertUuid(req.params.id, 'id');
  await restaurants.assertExists(id);
  const page = v.validatePagination(req.query);
  const status = ordersService.STATUSES.includes(req.query.status) ? req.query.status : null;
  const { total, orders: rows } = await ordersService.listForRestaurant(id, {
    status,
    limit: page.limit,
    offset: page.offset,
  });
  res.json({ total, page: page.page, limit: page.limit, orders: rows });
}

module.exports = {
  overview: asyncHandler(overview),
  listRestaurants: asyncHandler(listRestaurants),
  createRestaurant: asyncHandler(createRestaurant),
  getRestaurant: asyncHandler(getRestaurant),
  updateRestaurant: asyncHandler(updateRestaurant),
  deleteRestaurant: asyncHandler(deleteRestaurant),
  createAdminUser: asyncHandler(createAdminUser),
  resetAdminPassword: asyncHandler(resetAdminPassword),
  toggleAdminActive: asyncHandler(toggleAdminActive),
  deleteAdminUser: asyncHandler(deleteAdminUser),
  listOrdersForRestaurant: asyncHandler(listOrdersForRestaurant),
};
