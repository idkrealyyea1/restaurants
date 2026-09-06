'use strict';

/**
 * Input validation & normalization for every endpoint.
 * Controllers receive fully-normalized values or a 400 is thrown.
 */

const {
  requireText,
  cleanText,
  cleanPhone,
  normalizeHexColor,
  normalizeSlug,
  toIntInRange,
  toBool,
  assertUuid,
  assertTime,
} = require('../utils/checks');
const { badRequest } = require('../utils/errors');
const { isValidTimezone } = require('../utils/datetime');
const { STATUSES } = require('../services/orders.service');

/* ---------------------------- auth ---------------------------- */

function validateLogin(body = {}) {
  const identifier = requireText(body.identifier, { field: 'identifier', min: 3, max: 120 });
  const password = typeof body.password === 'string' && body.password.length >= 1 && body.password.length <= 200
    ? body.password
    : (() => { throw badRequest('password is required'); })();
  return { identifier, password };
}

/* ------------------------- restaurants ------------------------ */

const NAME_OPTS = { field: 'name', min: 2, max: 80 };

function validateRestaurantCreate(body = {}) {
  return {
    name: requireText(body.name, NAME_OPTS),
    slug: body.slug === undefined || body.slug === '' ? undefined : normalizeSlug(String(body.slug)),
    maxMenuItems: toIntInRange(body.maxMenuItems, 'maxMenuItems', { min: 1, max: 10000, fallback: 30 }),
  };
}

function validateRestaurantUpdate(body = {}) {
  const patch = {};
  if (body.name !== undefined) patch.name = requireText(body.name, NAME_OPTS);
  if (body.slug !== undefined) patch.slug = normalizeSlug(String(body.slug));
  if (body.maxMenuItems !== undefined) patch.maxMenuItems = toIntInRange(body.maxMenuItems, 'maxMenuItems', { min: 1, max: 10000 });
  if (body.isActive !== undefined) patch.isActive = toBool(body.isActive, 'isActive');
  if (body.primaryColor !== undefined) patch.primaryColor = normalizeHexColor(body.primaryColor, 'primaryColor');
  if (body.secondaryColor !== undefined) patch.secondaryColor = normalizeHexColor(body.secondaryColor, 'secondaryColor');
  if (Object.keys(patch).length === 0) throw badRequest('No updatable fields provided');
  return patch;
}

/* -------------------------- admins ---------------------------- */

function validateUsername(value) {
  const username = String(value || '');
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
    throw badRequest('username must be 3-40 characters (letters, digits, . _ -)', [{ field: 'username' }]);
  }
  return username;
}

function validateEmailOptional(value) {
  if (value === undefined || value === null || value === '') return null;
  const email = String(value).trim();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw badRequest('email is invalid', [{ field: 'email' }]);
  }
  return email;
}

function validatePassword(value, field = 'password') {
  if (typeof value !== 'string' || value.length < 10 || value.length > 200) {
    throw badRequest(`${field} must be 10-200 characters`, [{ field, rule: 'minLength', min: 10 }]);
  }
  return value;
}

/* ------------------------- categories ------------------------- */

function validateCategoryCreate(body = {}) {
  return {
    name: requireText(body.name, { field: 'name', min: 1, max: 60 }),
    position: toIntInRange(body.position, 'position', { min: 0, max: 9999, fallback: 0 }),
  };
}

function validateCategoryUpdate(body = {}) {
  const patch = {};
  if (body.name !== undefined) patch.name = requireText(body.name, { field: 'name', min: 1, max: 60 });
  if (body.position !== undefined) patch.position = toIntInRange(body.position, 'position', { min: 0, max: 9999 });
  if (Object.keys(patch).length === 0) throw badRequest('No updatable fields provided');
  return patch;
}

/* ------------------------- menu items ------------------------- */

function validateItemCreate(body = {}) {
  return {
    categoryId: assertUuid(body.categoryId, 'categoryId'),
    name: requireText(body.name, { field: 'name', min: 1, max: 100 }),
    description: cleanText(body.description, { field: 'description', max: 500 }) || '',
    priceCents: toIntInRange(body.priceCents, 'priceCents', { min: 0, max: 10000000 }),
    imagePath: body.imagePath === undefined || body.imagePath === '' ? null : assertUploadPath(body.imagePath),
    isAvailable: toBool(body.isAvailable, 'isAvailable', true),
    isPopular: toBool(body.isPopular, 'isPopular', false),
    position:
      body.position === undefined || body.position === null || body.position === ''
        ? undefined
        : toIntInRange(body.position, 'position', { min: 0, max: 99999 }),
  };
}

function validateItemUpdate(body = {}) {
  const patch = {};
  if (body.categoryId !== undefined) patch.categoryId = assertUuid(body.categoryId, 'categoryId');
  if (body.name !== undefined) patch.name = requireText(body.name, { field: 'name', min: 1, max: 100 });
  if (body.description !== undefined) patch.description = cleanText(body.description, { field: 'description', max: 500 }) || '';
  if (body.priceCents !== undefined) patch.priceCents = toIntInRange(body.priceCents, 'priceCents', { min: 0, max: 10000000 });
  if (body.imagePath !== undefined) patch.imagePath = body.imagePath === null || body.imagePath === '' ? null : assertUploadPath(body.imagePath);
  if (body.isAvailable !== undefined) patch.isAvailable = toBool(body.isAvailable, 'isAvailable');
  if (body.isPopular !== undefined) patch.isPopular = toBool(body.isPopular, 'isPopular');
  if (body.position !== undefined) patch.position = toIntInRange(body.position, 'position', { min: 0, max: 99999 });
  if (Object.keys(patch).length === 0) throw badRequest('No updatable fields provided');
  return patch;
}

/** Upload references must look like our generated public paths. */
function assertUploadPath(value) {
  if (typeof value !== 'string' || !/^\/uploads\/(logos|covers|items)\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(value)) {
    throw badRequest('imagePath is invalid', [{ field: 'imagePath' }]);
  }
  return value;
}

/* -------------------------- settings --------------------------- */

function validateSettingsUpdate(body = {}) {
  const patch = {};
  if (body.description !== undefined) patch.description = cleanText(body.description, { field: 'description', max: 500 }) || '';
  if (body.phone !== undefined) patch.phone = cleanPhone(body.phone, { field: 'phone' }) || '';
  if (body.whatsapp !== undefined) patch.whatsapp = cleanPhone(body.whatsapp, { field: 'whatsapp' }) || '';
  if (body.address !== undefined) patch.address = cleanText(body.address, { field: 'address', max: 300 }) || '';
  if (body.timezone !== undefined) {
    const tz = String(body.timezone).trim();
    if (!isValidTimezone(tz)) throw badRequest('timezone is not a valid IANA zone', [{ field: 'timezone' }]);
    patch.timezone = tz;
  }
  if (body.logoPath !== undefined) patch.logoPath = body.logoPath ? assertUploadPath(body.logoPath) : null;
  if (body.coverPath !== undefined) patch.coverPath = body.coverPath ? assertUploadPath(body.coverPath) : null;
  if (body.primaryColor !== undefined) patch.primaryColor = normalizeHexColor(body.primaryColor, 'primaryColor');
  if (body.secondaryColor !== undefined) patch.secondaryColor = normalizeHexColor(body.secondaryColor, 'secondaryColor');
  if (body.currency !== undefined) {
    const cur = String(body.currency).trim().toLowerCase();
    if (!/^[a-z]{3}$/.test(cur)) throw badRequest('currency must be a 3-letter ISO code', [{ field: 'currency' }]);
    patch.currency = cur;
  }
  if (body.deliveryFeeCents !== undefined) {
    patch.deliveryFeeCents = toIntInRange(body.deliveryFeeCents, 'deliveryFeeCents', { min: 0, max: 1000000 });
  }
  if (body.ignoreOpeningHours !== undefined) patch.ignoreOpeningHours = toBool(body.ignoreOpeningHours, 'ignoreOpeningHours');
  if (Object.keys(patch).length === 0) throw badRequest('No updatable fields provided');
  return patch;
}

/* ---------------------- opening hours -------------------------- */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function validateHours(bodyRows) {
  if (!Array.isArray(bodyRows) || bodyRows.length !== 7) {
    throw badRequest('hours must contain exactly 7 day rows (0-6)');
  }
  const seen = new Set();
  const out = bodyRows.map((row, idx) => {
    const day = toIntInRange(row && row.day, 'hours[].day', { min: 0, max: 6 });
    if (seen.has(day)) throw badRequest(`Duplicate hours entry for ${DAY_NAMES[day]}`);
    seen.add(day);
    const closed = toBool(row.closed, `hours[${idx}].closed`, false);
    const opensAt = assertTime(row.opensAt ?? '09:00', `hours[${idx}].opensAt`);
    const closesAt = assertTime(row.closesAt ?? '17:00', `hours[${idx}].closesAt`);
    return { day, closed, opensAt, closesAt };
  });
  out.sort((a, b) => a.day - b.day);
  return out;
}

/* -------------------------- checkout --------------------------- */

function validateCheckout(body = {}) {
  const customerName = requireText(body.customerName, { field: 'customerName', min: 2, max: 80 });
  const customerWhatsapp = cleanPhone(body.customerWhatsapp, { field: 'customerWhatsapp', required: true });
  const customerPhone = cleanPhone(body.customerPhone, { field: 'customerPhone' });

  const orderTypeRaw = body.orderType;
  if (orderTypeRaw !== 'pickup' && orderTypeRaw !== 'delivery') {
    throw badRequest('orderType must be "pickup" or "delivery"', [{ field: 'orderType' }]);
  }

  let customerAddress = null;
  if (orderTypeRaw === 'delivery') {
    customerAddress = requireText(body.customerAddress, { field: 'customerAddress', min: 5, max: 250 });
  } else if (body.customerAddress !== undefined && body.customerAddress !== '') {
    customerAddress = cleanText(body.customerAddress, { field: 'customerAddress', max: 250 }) || null;
  }

  const notes = cleanText(body.notes, { field: 'notes', max: 400 }) || null;

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw badRequest('Cart is empty', [{ field: 'items' }]);
  }
  if (body.items.length > 50) throw badRequest('Too many distinct items', [{ field: 'items' }]);

  const items = body.items.map((line) => ({
    itemId: assertUuid(line && line.itemId, 'items[].itemId'),
    quantity: toIntInRange(line && line.quantity, 'items[].quantity', { min: 1, max: 99 }),
  }));

  return { customerName, customerWhatsapp, customerPhone, customerAddress, orderType: orderTypeRaw, notes, items };
}

/* ---------------------- delivery groups ------------------------ */

function validateDeliveryGroupCreate(body = {}) {
  return {
    name: requireText(body.name, { field: 'name', min: 1, max: 80 }),
    phone: cleanPhone(body.phone, { field: 'phone' }) || '',
    notes: cleanText(body.notes, { field: 'notes', max: 300 }) || '',
  };
}

function validateDeliveryGroupUpdate(body = {}) {
  const patch = {};
  if (body.name !== undefined) patch.name = requireText(body.name, { field: 'name', min: 1, max: 80 });
  if (body.phone !== undefined) patch.phone = cleanPhone(body.phone, { field: 'phone' }) || '';
  if (body.notes !== undefined) patch.notes = cleanText(body.notes, { field: 'notes', max: 300 }) || '';
  if (Object.keys(patch).length === 0) throw badRequest('No updatable fields provided');
  return patch;
}

function validateDeliverySelection(body = {}) {
  if (!Array.isArray(body.groupIds)) throw badRequest('groupIds must be an array', [{ field: 'groupIds' }]);
  const ids = body.groupIds.map((id, i) => assertUuid(id, `groupIds[${i}]`));
  if (ids.length > 20) throw badRequest('Too many delivery groups selected');
  return [...new Set(ids)];
}

/* --------------------------- bookings --------------------------- */

const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'noshow'];

function validateBooking(body = {}) {
  const customerName = requireText(body.customerName, { field: 'customerName', min: 2, max: 80 });
  const customerWhatsapp = cleanPhone(body.customerWhatsapp, { field: 'customerWhatsapp', required: true });
  const customerPhone = cleanPhone(body.customerPhone, { field: 'customerPhone' });
  const tablesCount = toIntInRange(body.tablesCount, 'tablesCount', { min: 1, max: 20 });
  const rawAt = body.bookedAt;
  if (typeof rawAt !== 'string' || !rawAt) throw badRequest('bookedAt is required', [{ field: 'bookedAt' }]);
  const bookedAt = new Date(rawAt);
  if (Number.isNaN(bookedAt.getTime())) throw badRequest('bookedAt must be a valid ISO datetime', [{ field: 'bookedAt' }]);
  if (bookedAt.getTime() < Date.now() - 60 * 1000) throw badRequest('bookedAt cannot be in the past', [{ field: 'bookedAt' }]);
  const notes = cleanText(body.notes, { field: 'notes', max: 400 }) || null;
  return { customerName, customerWhatsapp, customerPhone, tablesCount, bookedAt: bookedAt.toISOString(), notes };
}

function validateBookingStatusChange(body = {}) {
  const status = body.status;
  if (!BOOKING_STATUSES.includes(status)) throw badRequest('Unknown booking status', [{ field: 'status' }]);
  return { status };
}

/* --------------------------- misc ------------------------------ */

function validateStatusChange(body = {}) {
  const status = body.status;
  if (!STATUSES.includes(status)) throw badRequest('Unknown order status', [{ field: 'status' }]);
  return { status };
}

function validatePagination(query) {
  const limit = Math.min(toIntInRange(query.limit, 'limit', { min: 1, max: 100, fallback: 25 }), 100);
  const page = Math.max(toIntInRange(query.page, 'page', { min: 1, max: 1000000, fallback: 1 }), 1);
  return { limit, offset: (page - 1) * limit, page };
}

module.exports = {
  validateLogin,
  validateRestaurantCreate,
  validateRestaurantUpdate,
  validateUsername,
  validateEmailOptional,
  validatePassword,
  validateCategoryCreate,
  validateCategoryUpdate,
  validateItemCreate,
  validateItemUpdate,
  validateSettingsUpdate,
  validateHours,
  validateCheckout,
  validateBooking,
  validateBookingStatusChange,
  BOOKING_STATUSES,
  validateStatusChange,
  validateDeliveryGroupCreate,
  validateDeliveryGroupUpdate,
  validateDeliverySelection,
  validatePagination,
};
