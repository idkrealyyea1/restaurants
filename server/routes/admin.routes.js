'use strict';

const express = require('express');
const admin = require('../controllers/admin.controller');
const { requireAuth, requireRestaurantAdmin } = require('../middleware/auth');

const router = express.Router();

// Platform owners may inspect tenant data through the same endpoints
// (admin.tenantId allows ?restaurantId= for role='owner').
router.use(requireAuth, requireRestaurantAdmin);

router.get('/restaurant', admin.myRestaurant);
router.patch('/status', admin.setStatus);
router.get('/dashboard', admin.dashboard);
router.get('/analytics', admin.analytics);
router.get('/qr', admin.qrCode);

// Live new-order notifications (Server-Sent Events)
router.get('/events', admin.events);

// Categories
router.get('/categories', admin.listCategories);
router.post('/categories', admin.createCategory);
router.patch('/categories/:id', admin.updateCategory);
router.delete('/categories/:id', admin.deleteCategory);

// Menu items
router.get('/items', admin.listItems);
router.post('/items', admin.createItem);
router.patch('/items/:id', admin.updateItem);
router.delete('/items/:id', admin.deleteItem);

// Orders
router.get('/orders', admin.listOrders);
router.get('/orders/:id', admin.getOrder);
router.patch('/orders/:id/status', admin.changeOrderStatus);

// Settings + opening hours
router.get('/settings', admin.getSettings);
router.patch('/settings', admin.updateSettings);
router.get('/hours', admin.getHours);
router.put('/hours', admin.updateHours);

// Image uploads (?type=logos|covers|items[&itemId=...])
router.post('/images', ...admin.uploadImage);

module.exports = router;
