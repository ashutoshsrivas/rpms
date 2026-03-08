'use strict';

const express = require('express');
const { pool } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
	getProfile,
	updateProfile,
	changePassword,
	listUsers,
	adminUpdateUser,
	adminChangeRole,
	adminResetPassword,
	adminCreateUser,
} = require('../controllers/userController');

const router = express.Router();

router.get('/approvers', async (_req, res) => {
	try {
		const [rows] = await pool.query(
			`SELECT id, name, email, role FROM users WHERE role IN ('HOD','ADMIN') ORDER BY role, name`
		);
		res.json(rows);
	} catch (err) {
		console.error('Failed to list approvers', err.message);
		res.status(500).json({ message: 'Failed to list approvers' });
	}
});

// Admin-only user management
router.get('/admin', authMiddleware, requireRole(['ADMIN']), listUsers);
router.patch('/admin/:id', authMiddleware, requireRole(['ADMIN']), adminUpdateUser);
router.patch('/admin/:id/role', authMiddleware, requireRole(['ADMIN']), adminChangeRole);
router.post('/admin/:id/password', authMiddleware, requireRole(['ADMIN']), adminResetPassword);
router.post('/admin', authMiddleware, requireRole(['ADMIN']), adminCreateUser);

router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateProfile);
router.post('/password', authMiddleware, changePassword);

module.exports = router;
