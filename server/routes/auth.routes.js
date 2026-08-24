'use strict';

const express = require('express');
const auth = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/ratelimit');

const router = express.Router();

router.post('/login', authLimiter, auth.login);
router.post('/logout', auth.logout);
router.get('/me', auth.me);

module.exports = router;
