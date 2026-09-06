'use strict';

const express = require('express');
const owner = require('../controllers/owner.controller');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireOwner);

router.get('/overview', owner.overview);
router.get('/reports/restaurants.csv', owner.restaurantsReportCsv);

router.get('/restaurants', owner.listRestaurants);
router.post('/restaurants', owner.createRestaurant);
router.get('/restaurants/:id', owner.getRestaurant);
router.patch('/restaurants/:id', owner.updateRestaurant);
router.delete('/restaurants/:id', owner.deleteRestaurant);

router.post('/restaurants/:id/admins', owner.createAdminUser);
router.post('/restaurants/:id/admins/:userId/reset-password', owner.resetAdminPassword);
router.patch('/restaurants/:id/admins/:userId', owner.toggleAdminActive);
router.delete('/restaurants/:id/admins/:userId', owner.deleteAdminUser);

router.get('/restaurants/:id/orders', owner.listOrdersForRestaurant);

router.get('/delivery-groups', owner.listDeliveryGroups);
router.post('/delivery-groups', owner.createDeliveryGroup);
router.patch('/delivery-groups/:id', owner.updateDeliveryGroup);
router.delete('/delivery-groups/:id', owner.deleteDeliveryGroup);

// Delivery company login accounts (one per company).
router.post('/delivery-groups/:id/account', owner.createDeliveryAccount);
router.post('/delivery-groups/:id/account/reset-password', owner.resetDeliveryAccountPassword);
router.patch('/delivery-groups/:id/account', owner.toggleDeliveryAccountActive);
router.delete('/delivery-groups/:id/account', owner.deleteDeliveryAccount);

module.exports = router;
