'use strict';

const express = require('express');
const config = require('../../config');
const restaurants = require('../services/restaurants.service');
const ordersService = require('../services/orders.service');
const bookingsService = require('../services/bookings.service');
const sse = require('../middleware/sse');
const { orderLimiter } = require('../middleware/ratelimit');
const { notFound } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');
const v = require('../validators');

const router = express.Router();

/** Public homepage directory of all active restaurants. */
router.get(
  '/restaurants',
  asyncHandler(async (req, res) => {
    res.json({ restaurants: await restaurants.listPublicDirectory() });
  })
);

/** Public storefront data for a restaurant slug. */
router.get(
  '/restaurants/:slug/menu',
  asyncHandler(async (req, res) => {
    const view = await restaurants.getPublicView(String(req.params.slug).toLowerCase());
    if (!view) throw notFound('Restaurant not found');
    res.json(view);
  })
);

/**
 * Customer checkout. No account required.
 * Money/availability/status are computed server-side only.
 */
router.post(
  '/restaurants/:slug/orders',
  orderLimiter,
  asyncHandler(async (req, res) => {
    const payload = v.validateCheckout(req.body);
    const restaurant = await restaurants.getBySlug(String(req.params.slug).toLowerCase());
    // Deliberately identical error when inactive vs missing (no enumeration).
    if (!restaurant || !restaurant.is_active) throw notFound('Restaurant not found');

    const order = await ordersService.createCheckout({ restaurantId: restaurant.id, payload });
    sse.broadcast(restaurant.id, 'order:new', {
      orderId: order.id,
      code: order.code,
      totalCents: order.total_cents,
      orderType: payload.orderType,
    });

    res.status(201).json({
      order: {
        code: order.code,
        status: order.status,
        totalCents: order.total_cents,
        subtotalCents: order.subtotal_cents,
        deliveryFeeCents: order.delivery_fee_cents,
        createdAt: order.created_at,
      },
    });
  })
);

/** Book a table (public, no account). */
router.post(
  '/restaurants/:slug/bookings',
  orderLimiter,
  asyncHandler(async (req, res) => {
    const payload = v.validateBooking(req.body);
    const restaurant = await restaurants.getBySlug(String(req.params.slug).toLowerCase());
    if (!restaurant || !restaurant.is_active) throw notFound('Restaurant not found');
    const booking = await bookingsService.create({ restaurantId: restaurant.id, payload });
    sse.broadcast(restaurant.id, 'booking:new', { bookingId: booking.id, code: booking.code, tablesCount: booking.tables_count, bookedAt: booking.booked_at });
    res.status(201).json({ booking: { code: booking.code, status: booking.status, bookedAt: booking.booked_at, tablesCount: booking.tables_count } });
  })
);

/** Customer order tracking by public code. */
router.get(
  '/orders/track/:code',
  asyncHandler(async (req, res) => {
    const code = String(req.params.code).trim();
    if (!/^[A-Za-z0-9]{6,12}$/.test(code)) throw notFound('No order found for this tracking code');
    const order = await ordersService.getByCode(code);
    res.json({ order });
  })
);

/** Customer cancels their own order within the grace window. */
router.post(
  '/orders/cancel',
  orderLimiter,
  asyncHandler(async (req, res) => {
    const code = String((req.body && req.body.code) || '').trim().toUpperCase();
    if (!/^[A-Za-z0-9]{6,12}$/.test(code)) throw notFound('No order found for this tracking code');
    const result = await ordersService.cancelByCustomer(code, config.customerCancelGraceMs);
    sse.broadcast(result.restaurantId, 'order:status', {
      orderId: result.id, code: result.code, status: result.status,
    });
    res.json({ ok: true, order: { code: result.code, status: result.status } });
  })
);

router.get('/healthz', (req, res) => res.json({ ok: true }));

module.exports = router;
