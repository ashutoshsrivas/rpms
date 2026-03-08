'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { signToken } = require('../utils/jwt');

async function register(req, res) {
	const { name, phone, email, password } = req.body || {};

	if (!email || !password || !name || !phone) {
		res.status(400).json({ message: 'Name, phone, email, and password are required' });
		return;
	}

	if (password.length < 6) {
		res.status(400).json({ message: 'Password must be at least 6 characters' });
		return;
	}

	try {
		const [existing] = await pool.query(
			' SELECT id FROM users WHERE email = :email LIMIT 1',
			{ email }
		);
		if (existing.length) {
			res.status(409).json({ message: 'Email already registered' });
			return;
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const role = 'USER';
		const [result] = await pool.query(
			'INSERT INTO users (name, phone, email, password_hash, role) VALUES (:name, :phone, :email, :password_hash, :role)',
			{ name, phone, email, password_hash: passwordHash, role }
		);

		const user = { id: result.insertId, name, phone, email, role };
		const token = signToken(user);
		res.status(201).json({ user, token });
	} catch (err) {
		console.error('Failed to register user:', err.message);
		res.status(500).json({ message: 'Unable to register' });
	}
}

async function login(req, res) {
	const { email, password } = req.body || {};

	if (!email || !password) {
		res.status(400).json({ message: 'Email and password are required' });
		return;
	}

	try {
		const [rows] = await pool.query(
			' SELECT id, name, phone, email, password_hash, role FROM users WHERE email = :email LIMIT 1',
			{ email }
		);
		const user = rows?.[0];

		if (!user) {
			res.status(401).json({ message: 'Invalid credentials' });
			return;
		}

		const valid = await bcrypt.compare(password, user.password_hash);
		if (!valid) {
			res.status(401).json({ message: 'Invalid credentials' });
			return;
		}

		const token = signToken(user);
		res.json({ user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role }, token });
	} catch (err) {
		console.error('Failed to login user:', err.message);
		res.status(500).json({ message: 'Unable to login' });
	}
}

module.exports = { register, login };
