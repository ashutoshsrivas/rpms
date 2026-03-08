'use strict';

const express = require('express');
const { baseDashboard, adminDashboard, hodDashboard, userDashboard } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', baseDashboard);
router.get('/admin', requireRole(['ADMIN']), adminDashboard);
router.get('/hod', requireRole(['HOD']), hodDashboard);
router.get('/user', requireRole(['USER']), userDashboard);

module.exports = router;
