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

// Approver picklist for request forms. Requires a known caller (any signed-in
// user, identified by the x-user-email header) so the HOD/ADMIN directory is
// not exposed anonymously.
router.get('/approvers', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	if (!actorEmail) return res.status(401).json({ message: 'Authentication required' });
	try {
		const [known] = await pool.query(
			`SELECT id FROM users WHERE email = :email LIMIT 1`,
			{ email: actorEmail }
		);
		if (!known.length) return res.status(403).json({ message: 'Forbidden' });

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
