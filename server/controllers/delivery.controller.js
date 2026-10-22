'use strict';

/**
 * Delivery-company dashboard. Every handler is scoped to the delivery group
 * linked to the signed-in account by requireDelivery, so one company can never
 * read or update another company's orders.
 */

const delivery = require('../services/delivery.service');
const notifications = require('../services/notifications.service');
const v = require('../validators');
const { asyncHandler, notFound } = require('../utils/errors');

async function me(req, res) {
  const group = await delivery.getById(req.user.delivery_group_id);
  if (!group) throw notFound('Delivery company not found');
  res.json({ group: { id: group.id, name: group.name, phone: group.phone || '' } });
}

async function listOrders(req, res) {
  const page = v.validatePagination(req.query);
  const status = req.query.status || null;
  const result = await delivery.listOrdersForGroup(req.user.delivery_group_id, {
    status,
    limit: page.limit,
    offset: page.offset,
  });
  res.json({ total: result.total, page: page.page, limit: page.limit, orders: result.orders });
}

async function updateOrderStatus(req, res) {
  const { status } = v.validateStatusChange(req.body);
  const order = await delivery.updateOrderStatus(req.user.delivery_group_id, req.params.id, status);
  // Keep the restaurant dashboard's live order list in sync.
  notifications.emit({
    restaurantId: order.restaurant_id,
    type: 'order.status_changed',
    orderId: order.id,
    orderCode: order.code,
    status: order.status,
  });
  res.json({ order: { id: order.id, code: order.code, status: order.status } });
}

module.exports = {
  me: asyncHandler(me),
  listOrders: asyncHandler(listOrders),
  updateOrderStatus: asyncHandler(updateOrderStatus),
};
