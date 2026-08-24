'use strict';

const express = require('express');
const restaurants = require('../services/restaurants.service');
const ordersService = require('../services/orders.service');
const sse = require('../middleware/sse');
const { orderLimiter } = require('../middleware/ratelimit');
const { notFound } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');
const v = require('../validators');

const router = express.Router();

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

router.get('/healthz', (req, res) => res.json({ ok: true }));

module.exports = router;
