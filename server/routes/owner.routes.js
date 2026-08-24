'use strict';

const express = require('express');
const owner = require('../controllers/owner.controller');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireOwner);

router.get('/overview', owner.overview);

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

module.exports = router;
