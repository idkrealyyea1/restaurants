'use strict';

/**
 * Delivery-company dashboard controller.
 * SECURITY: scope is ALWAYS the authenticated user's delivery_group_id —
 * a delivery account can only ever see orders for restaurants that selected
 * its company, and may only advance them along the delivery lifecycle.
 */

const delivery = require('../services/delivery.service');
const { asyncHandler, badRequest } = require('../utils/errors');
const { assertUuid } = require('../utils/checks');
const v = require('../validators');

const DELIVERY_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];

async function me(req, res) {
  const group = await delivery.getById(req.user.delivery_group_id);
  res.json({
    delivery: {
      deliveryGroupId: req.user.delivery_group_id,
      companyName: group ? group.name : null,
      username: req.user.username,
    },
  });
}

async function listOrders(req, res) {
  const page = v.validatePagination(req.query);
  const status = DELIVERY_STATUSES.includes(req.query.status) ? req.query.status : null;
  const { total, orders: rows } = await delivery.listOrdersForGroup(req.user.delivery_group_id, {
    status,
    limit: page.limit,
    offset: page.offset,
  });
  res.json({ total, page: page.page, limit: page.limit, orders: rows });
}

async function updateOrderStatus(req, res) {
  const id = assertUuid(req.params.id, 'id');
  const status = req.body && req.body.status;
  if (!['out_for_delivery', 'completed'].includes(status)) {
    throw badRequest('status must be "out_for_delivery" or "completed"');
  }
  const row = await delivery.updateOrderStatus(req.user.delivery_group_id, id, status);
  res.json({ order: row });
}

module.exports = {
  me: asyncHandler(me),
  listOrders: asyncHandler(listOrders),
  updateOrderStatus: asyncHandler(updateOrderStatus),
};
