'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function getProfile(req, res) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json({ message: 'Unauthorized' });
	}

	try {
		const [rows] = await pool.query(
			' SELECT id, name, phone, email, role, created_at FROM users WHERE id = :id LIMIT 1',
			{ id: userId }
		);
		if (!rows.length) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.json(rows[0]);
	} catch (err) {
		console.error('Failed to load profile', err.message);
		res.status(500).json({ message: 'Unable to load profile' });
	}
}

async function updateProfile(req, res) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json({ message: 'Unauthorized' });
	}

	const name = (req.body?.name || '').toString().trim();
	const phone = (req.body?.phone || '').toString().trim();

	if (!name || !phone) {
		return res.status(400).json({ message: 'Name and phone are required' });
	}

	try {
		await pool.query('UPDATE users SET name = :name, phone = :phone WHERE id = :id', {
			name,
			phone,
			id: userId,
		});

		const [rows] = await pool.query(
			' SELECT id, name, phone, email, role, created_at FROM users WHERE id = :id LIMIT 1',
			{ id: userId }
		);
		res.json(rows[0]);
	} catch (err) {
		console.error('Failed to update profile', err.message);
		res.status(500).json({ message: 'Unable to update profile' });
	}
}

async function changePassword(req, res) {
	const userId = req.user?.id;
	if (!userId) {
		return res.status(401).json({ message: 'Unauthorized' });
	}

	const currentPassword = (req.body?.currentPassword || '').toString();
	const newPassword = (req.body?.newPassword || '').toString();

	if (!currentPassword || !newPassword) {
		return res.status(400).json({ message: 'Current and new passwords are required' });
	}

	if (newPassword.length < 6) {
		return res.status(400).json({ message: 'New password must be at least 6 characters' });
	}

	try {
		const [rows] = await pool.query(
			' SELECT password_hash FROM users WHERE id = :id LIMIT 1',
			{ id: userId }
		);
		if (!rows.length) {
			return res.status(404).json({ message: 'User not found' });
		}

		const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
		if (!valid) {
			return res.status(400).json({ message: 'Current password is incorrect' });
		}

		const password_hash = await bcrypt.hash(newPassword, 10);
		await pool.query('UPDATE users SET password_hash = :password_hash WHERE id = :id', {
			password_hash,
			id: userId,
		});

		res.json({ message: 'Password updated' });
	} catch (err) {
		console.error('Failed to update password', err.message);
		res.status(500).json({ message: 'Unable to update password' });
	}
}

async function listUsers(_req, res) {
	try {
		const [rows] = await pool.query(
			' SELECT id, name, phone, email, role, created_at FROM users ORDER BY created_at DESC '
		);
		res.json(rows);
	} catch (err) {
		console.error('Failed to list users', err.message);
		res.status(500).json({ message: 'Unable to list users' });
	}
}

async function adminUpdateUser(req, res) {
	const userId = Number(req.params.id);
 	if (!userId) return res.status(400).json({ message: 'Invalid user id' });

 	const name = (req.body?.name || '').toString().trim();
 	const email = (req.body?.email || '').toString().trim();
 	const phone = (req.body?.phone || '').toString().trim();

 	if (!name || !email) {
 		return res.status(400).json({ message: 'Name and email are required' });
 	}

 	try {
 		await pool.query('UPDATE users SET name = :name, email = :email, phone = :phone WHERE id = :id', {
 			name,
 			email,
 			phone,
 			id: userId,
 		});

 		const [rows] = await pool.query(
 			' SELECT id, name, phone, email, role, created_at FROM users WHERE id = :id LIMIT 1',
 			{ id: userId }
 		);
 		if (!rows.length) return res.status(404).json({ message: 'User not found' });
 		res.json(rows[0]);
 	} catch (err) {
 		console.error('Failed to update user', err.message);
 		if (err && err.code === 'ER_DUP_ENTRY') {
 			return res.status(400).json({ message: 'Email already in use' });
 		}
 		res.status(500).json({ message: 'Unable to update user' });
 	}
}

async function adminCreateUser(req, res) {
	const name = (req.body?.name || '').toString().trim();
	const email = (req.body?.email || '').toString().trim();
	const phone = (req.body?.phone || '').toString().trim();
	const role = (req.body?.role || 'USER').toString().toUpperCase();
	const password = (req.body?.password || '').toString();

	const allowed = ['USER', 'HOD', 'ADMIN'];
	if (!name || !email || !password) {
		return res.status(400).json({ message: 'Name, email, and password are required' });
	}
	if (!allowed.includes(role)) {
		return res.status(400).json({ message: 'Role must be USER, HOD, or ADMIN' });
	}
	if (password.length < 6) {
		return res.status(400).json({ message: 'Password must be at least 6 characters' });
	}

	try {
		const password_hash = await bcrypt.hash(password, 10);
		const [result] = await pool.query(
			'INSERT INTO users (name, email, phone, role, password_hash) VALUES (:name, :email, :phone, :role, :password_hash)',
			{ name, email, phone, role, password_hash }
		);
		const newId = result?.insertId;
		const [rows] = await pool.query(
			' SELECT id, name, phone, email, role, created_at FROM users WHERE id = :id LIMIT 1',
			{ id: newId }
		);
		res.status(201).json(rows[0]);
	} catch (err) {
		console.error('Failed to create user', err.message);
		if (err && err.code === 'ER_DUP_ENTRY') {
			return res.status(400).json({ message: 'Email already in use' });
		}
		res.status(500).json({ message: 'Unable to create user' });
	}
}

async function adminChangeRole(req, res) {
 	const userId = Number(req.params.id);
 	if (!userId) return res.status(400).json({ message: 'Invalid user id' });

 	const role = (req.body?.role || '').toString().toUpperCase();
 	const allowed = ['USER', 'HOD', 'ADMIN'];
 	if (!allowed.includes(role)) {
 		return res.status(400).json({ message: 'Role must be USER, HOD, or ADMIN' });
 	}

 	try {
 		await pool.query('UPDATE users SET role = :role WHERE id = :id', { role, id: userId });
 		const [rows] = await pool.query(
 			' SELECT id, name, phone, email, role, created_at FROM users WHERE id = :id LIMIT 1',
 			{ id: userId }
 		);
 		if (!rows.length) return res.status(404).json({ message: 'User not found' });
 		res.json(rows[0]);
 	} catch (err) {
 		console.error('Failed to change role', err.message);
 		res.status(500).json({ message: 'Unable to change role' });
 	}
}

async function adminResetPassword(req, res) {
 	const userId = Number(req.params.id);
 	if (!userId) return res.status(400).json({ message: 'Invalid user id' });

 	const newPassword = (req.body?.newPassword || '').toString();
 	if (!newPassword || newPassword.length < 6) {
 		return res.status(400).json({ message: 'New password must be at least 6 characters' });
 	}

 	try {
 		const password_hash = await bcrypt.hash(newPassword, 10);
 		await pool.query('UPDATE users SET password_hash = :password_hash WHERE id = :id', {
 			password_hash,
 			id: userId,
 		});
 		res.json({ message: 'Password updated' });
 	} catch (err) {
 		console.error('Failed to reset password', err.message);
 		res.status(500).json({ message: 'Unable to update password' });
 	}
}

module.exports = {
	getProfile,
	updateProfile,
	changePassword,
	listUsers,
	adminUpdateUser,
	adminChangeRole,
	adminResetPassword,
	adminCreateUser,
};
