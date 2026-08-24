'use strict';

/**
 * Restaurant-admin controller.
 * SECURITY: every handler derives restaurantId from req.user (server-side),
 * never from the request. Owners bypass tenant scoping only where noted.
 */

const QRCode = require('qrcode');
const config = require('../../config');
const restaurants = require('../services/restaurants.service');
const categoriesService = require('../services/categories.service');
const menu = require('../services/menu.service');
const orders = require('../services/orders.service');
const settingsService = require('../services/settings.service');
const sse = require('../middleware/sse');
const { handleImageUpload, persistSavedImage, deleteUpload } = require('../middleware/upload');
const { forbidden, notFound, badRequest } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');
const v = require('../validators');

function tenantId(req) {
  if (req.user.role === 'owner') {
    // Platform owner may inspect a specific restaurant via ?restaurantId=
    const id = req.query.restaurantId;
    if (!id) throw forbidden('RESTAURANT_REQUIRED', 'Specify ?restaurantId=');
    return id;
  }
  return req.user.restaurant_id;
}

/* ------------------------- overview ---------------------------- */

async function myRestaurant(req, res) {
  const id = tenantId(req);
  const restaurant = await restaurants.getById(id);
  if (!restaurant) throw notFound('Restaurant not found');
  const settings = await settingsService.getOwned(id);
  res.json({
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      status: restaurant.status,
      maxMenuItems: restaurant.max_menu_items,
      itemCount: await restaurants.countItems(id),
    },
    settings,
    openNow: await settingsService.computeOpenNow(id),
  });
}

const RESTAURANT_STATUSES = ['open', 'closed', 'temporarily_closed'];

/** Restaurant admins set their own restaurant's open/closed status here. */
async function setStatus(req, res) {
  const id = tenantId(req);
  const { status } = req.body || {};
  if (!RESTAURANT_STATUSES.includes(status)) {
    throw badRequest('status must be one of: ' + RESTAURANT_STATUSES.join(', '));
  }
  const updated = await restaurants.updateRestaurant(id, { status });
  if (!updated) throw notFound('Restaurant not found');
  res.json({ status: updated.status });
}

async function dashboard(req, res) {
  const id = tenantId(req);
  const restaurant = await restaurants.getById(id);
  res.json({
    counts: await orders.dashboardCounts(id, await tzOf(id)),
    itemCount: await restaurants.countItems(id),
    maxMenuItems: restaurant ? restaurant.max_menu_items : null,
    openNow: await settingsService.computeOpenNow(id),
  });
}

async function tzOf(restaurantId) {
  const settings = await restaurants.getSettings(restaurantId);
  return settings.timezone || 'UTC';
}

/* -------------------------- orders ------------------------------ */

async function listOrders(req, res) {
  const id = tenantId(req);
  const page = v.validatePagination(req.query);
  const { total, orders: rows } = await orders.listForRestaurant(id, {
    status: req.query.status || null,
    limit: page.limit,
    offset: page.offset,
  });
  res.json({ total, page: page.page, limit: page.limit, orders: rows });
}

async function getOrder(req, res) {
  const row = await orders.getForRestaurant(tenantId(req), req.params.id);
  res.json({ order: row });
}

async function changeOrderStatus(req, res) {
  const { status } = v.validateStatusChange(req.body);
  const row = await orders.changeStatus(tenantId(req), req.params.id, status);
  sse.broadcast(tenantId(req), 'order:status', { orderId: row.id, code: row.code, status: row.status });
  res.json({ order: row });
}

/* ------------------------ categories ---------------------------- */

async function listCategories(req, res) {
  res.json({ categories: await categoriesService.listOwned(tenantId(req)) });
}

async function createCategory(req, res) {
  const data = v.validateCategoryCreate(req.body);
  res.status(201).json({ category: await categoriesService.createOwned(tenantId(req), data) });
}

async function updateCategory(req, res) {
  const patch = v.validateCategoryUpdate(req.body);
  res.json({ category: await categoriesService.updateOwned(tenantId(req), req.params.id, patch) });
}

async function deleteCategory(req, res) {
  await categoriesService.deleteOwned(tenantId(req), req.params.id);
  res.json({ ok: true });
}

/* -------------------------- items -------------------------------- */

async function listItems(req, res) {
  res.json({ items: await menu.listOwned(tenantId(req)) });
}

async function createItem(req, res) {
  const data = v.validateItemCreate(req.body);
  res.status(201).json({ item: await menu.createOwned(tenantId(req), data) });
}

async function updateItem(req, res) {
  const patch = v.validateItemUpdate(req.body);
  res.json({ item: await menu.updateOwned(tenantId(req), req.params.id, patch) });
}

async function deleteItem(req, res) {
  await menu.deleteOwned(tenantId(req), req.params.id);
  res.json({ ok: true });
}

/* ------------------------- settings ------------------------------ */

async function getSettings(req, res) {
  const id = tenantId(req);
  res.json({ settings: await settingsService.getOwned(id), openNow: await settingsService.computeOpenNow(id) });
}

async function updateSettings(req, res) {
  const patch = v.validateSettingsUpdate(req.body);
  const updated = await settingsService.updateOwned(tenantId(req), patch);
  res.json({ settings: updated });
}

async function getHours(req, res) {
  res.json({ hours: await settingsService.getHours(tenantId(req)) });
}

async function updateHours(req, res) {
  const rows = v.validateHours(req.body.hours);
  await settingsService.setHours(tenantId(req), rows);
  res.json({ hours: await settingsService.getHours(tenantId(req)) });
}

/* -------------------------- uploads ------------------------------ */

/**
 * POST /api/admin/images?type=logos|covers|items[&itemId=...]
 * The reference is attached to settings/item immediately (no orphan files).
 */
const uploadImage = [
  handleImageUpload,
  asyncHandler(async (req, res) => {
    const id = tenantId(req);
    await persistSavedImage(req);

    try {
      if (req.query.type === 'logos') {
        const old = (await settingsService.getOwned(id)).logoPath;
        await settingsService.updateOwned(id, { logoPath: req.savedImagePublicPath });
        if (old) await deleteUpload(old);
      } else if (req.query.type === 'covers') {
        const old = (await settingsService.getOwned(id)).coverPath;
        await settingsService.updateOwned(id, { coverPath: req.savedImagePublicPath });
        if (old) await deleteUpload(old);
      } else {
        // items: attach to an owned menu item
        const itemId = req.query.itemId;
        if (!itemId) throw notFound('itemId query parameter is required');
        const old = (await menu.getOwned(id, itemId)).image_path;
        await menu.updateOwned(id, itemId, { imagePath: req.savedImagePublicPath });
        if (old) await deleteUpload(old);
      }
    } catch (err) {
      await deleteUpload(req.savedImagePublicPath); // don't leave orphans on failure
      throw err;
    }

    res.status(201).json({ path: req.savedImagePublicPath });
  }),
];

/* ----------------------------- QR -------------------------------- */

async function qrCode(req, res) {
  const id = tenantId(req);
  const restaurant = await restaurants.getById(id);
  if (!restaurant) throw notFound('Restaurant not found');

  let base = config.appUrl;
  if (!base) {
    const proto = req.protocol;
    const host = req.headers.host;
    base = `${proto}://${host}`;
  }
  const url = `${base}/restaurant/${restaurant.slug}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 320 });

  res.json({ url, svg });
}

/* --------------------------- analytics --------------------------- */

async function analytics(req, res) {
  const id = tenantId(req);
  const days = Math.min(Math.max(Number.parseInt(req.query.days, 10) || 7, 1), 90);
  const tz = await tzOf(id);
  const [series, top] = await Promise.all([
    orders.analyticsSeries(id, tz, days),
    orders.topItems(id, Math.max(days, 30)),
  ]);
  res.json({ ...series, today: await orders.dashboardCounts(id, tz), topItems: top });
}

/* ----------------------------- SSE ------------------------------- */

function events(req, res) {
  const id = tenantId(req);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');
  sse.addClient(id, res);
}

module.exports = {
  tenantId,
  myRestaurant: asyncHandler(myRestaurant),
  setStatus: asyncHandler(setStatus),
  dashboard: asyncHandler(dashboard),
  listOrders: asyncHandler(listOrders),
  getOrder: asyncHandler(getOrder),
  changeOrderStatus: asyncHandler(changeOrderStatus),
  listCategories: asyncHandler(listCategories),
  createCategory: asyncHandler(createCategory),
  updateCategory: asyncHandler(updateCategory),
  deleteCategory: asyncHandler(deleteCategory),
  listItems: asyncHandler(listItems),
  createItem: asyncHandler(createItem),
  updateItem: asyncHandler(updateItem),
  deleteItem: asyncHandler(deleteItem),
  getSettings: asyncHandler(getSettings),
  updateSettings: asyncHandler(updateSettings),
  getHours: asyncHandler(getHours),
  updateHours: asyncHandler(updateHours),
  uploadImage,
  qrCode: asyncHandler(qrCode),
  analytics: asyncHandler(analytics),
  events,
};
