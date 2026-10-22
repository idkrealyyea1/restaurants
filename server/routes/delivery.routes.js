'use strict';

const express = require('express');
const delivery = require('../controllers/delivery.controller');
const { requireAuth, requireDelivery } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireDelivery);

router.get('/me', delivery.me);
router.get('/orders', delivery.listOrders);
router.patch('/orders/:id/status', delivery.updateOrderStatus);

module.exports = router;
