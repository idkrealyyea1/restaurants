'use strict';

const express = require('express');
const owner = require('../controllers/owner.controller');
const { requireAuth, requireOwner, requireOwnerOrStaff, forbidStaffDelete } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Staff can read and create, but not delete — owner can do everything
router.get('/overview', requireOwnerOrStaff, owner.overview);
router.get('/reports/restaurants.csv', requireOwnerOrStaff, owner.restaurantsReportCsv);

router.get('/restaurants', requireOwnerOrStaff, owner.listRestaurants);
router.post('/restaurants', requireOwnerOrStaff, forbidStaffDelete, owner.createRestaurant);
router.get('/restaurants/:id', requireOwnerOrStaff, owner.getRestaurant);
router.patch('/restaurants/:id', requireOwnerOrStaff, forbidStaffDelete, owner.updateRestaurant);
router.delete('/restaurants/:id', requireOwner, owner.deleteRestaurant);

// Staff management — owner only (see all users/passwords)
router.get('/staff', requireOwner, owner.listStaff);
router.post('/staff', requireOwner, owner.createStaff);
router.patch('/staff/:id', requireOwner, owner.toggleStaffActive);
router.delete('/staff/:id', requireOwner, owner.deleteStaff);
router.post('/staff/:id/reset-password', requireOwner, owner.resetStaffPassword);

router.post('/restaurants/:id/admins', requireOwnerOrStaff, forbidStaffDelete, owner.createAdminUser);
router.post('/restaurants/:id/admins/:userId/reset-password', requireOwner, owner.resetAdminPassword);
router.patch('/restaurants/:id/admins/:userId', requireOwnerOrStaff, forbidStaffDelete, owner.toggleAdminActive);
router.delete('/restaurants/:id/admins/:userId', requireOwner, owner.deleteAdminUser);

router.get('/restaurants/:id/orders', requireOwnerOrStaff, owner.listOrdersForRestaurant);

router.get('/delivery-groups', requireOwnerOrStaff, owner.listDeliveryGroups);
router.post('/delivery-groups', requireOwnerOrStaff, forbidStaffDelete, owner.createDeliveryGroup);
router.patch('/delivery-groups/:id', requireOwnerOrStaff, forbidStaffDelete, owner.updateDeliveryGroup);
router.delete('/delivery-groups/:id', requireOwner, owner.deleteDeliveryGroup);

// Delivery company login accounts (one per company).
router.post('/delivery-groups/:id/account', requireOwnerOrStaff, forbidStaffDelete, owner.createDeliveryAccount);
router.post('/delivery-groups/:id/account/reset-password', requireOwner, owner.resetDeliveryAccountPassword);
router.patch('/delivery-groups/:id/account', requireOwnerOrStaff, forbidStaffDelete, owner.toggleDeliveryAccountActive);
router.delete('/delivery-groups/:id/account', requireOwner, owner.deleteDeliveryAccount);

module.exports = router;
