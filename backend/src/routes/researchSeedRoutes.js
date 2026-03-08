'use strict';

const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();
const ALLOWED_TYPES = ['seed-research', 'conference', 'workshop', 'fdp', 'laptop-grant', 'external-funding'];

function resolveType(input, fallback = 'seed-research') {
	const normalized = (input || '').toString().toLowerCase();
	if (!normalized) return fallback;
	if (ALLOWED_TYPES.includes(normalized)) return normalized;
	throw new Error('Invalid request type');
}

function resolveListTypes(param) {
	const normalized = (param || '').toString().toLowerCase();
	if (!normalized) return ['seed-research'];
	if (normalized === 'all') return ALLOWED_TYPES;
	if (ALLOWED_TYPES.includes(normalized)) return [normalized];
	throw new Error('Invalid request type');
}

router.post('/drafts', async (req, res) => {
	const userEmail = (req.body?.userEmail || req.headers['x-user-email'] || '').toString().toLowerCase();
	const data = req.body?.data;
	const upload = req.body?.upload || {};
	const approvalAuthority = req.body?.approvalAuthority || '';
	let requestType = 'seed-research';

	try {
		requestType = resolveType(req.body?.requestType, 'seed-research');
	} catch (err) {
		return res.status(400).json({ message: err.message });
	}

	if (!userEmail) {
		return res.status(400).json({ message: 'User email is required' });
	}
	if (!data) {
		return res.status(400).json({ message: 'Form data is required' });
	}

	try {
		const payload = JSON.stringify(data);
		const [result] = await pool.query(
			`INSERT INTO requests (user_email, request_type, data, upload_key, upload_url, approval_authority, status) VALUES (:user_email, :request_type, :data, :upload_key, :upload_url, :approval_authority, 'draft')`,
			{
				user_email: userEmail,
				request_type: requestType,
				data: payload,
				upload_key: upload.key || null,
				upload_url: upload.url || null,
				approval_authority: approvalAuthority,
			}
		);

		res.status(201).json({ id: result.insertId, status: 'draft' });
	} catch (err) {
		console.error('Failed to save draft', err.message);
		res.status(500).json({ message: 'Failed to save draft' });
	}
});

router.get('/drafts', async (req, res) => {
	const email = (req.query.email || req.headers['x-user-email'] || '').toString().toLowerCase();
	let types;
	if (!email) {
		return res.status(400).json({ message: 'Email is required' });
	}

	try {
		types = resolveListTypes(req.query.type);
	} catch (err) {
		return res.status(400).json({ message: err.message });
	}

	try {
		const [rows] = await pool.query(
			`SELECT id, user_email, request_type, data, upload_key, upload_url, approval_authority, status, created_at, updated_at FROM requests WHERE user_email = ? AND request_type IN (?) ORDER BY created_at DESC`,
			[email, types]
		);
		res.json(rows);
	} catch (err) {
		console.error('Failed to list drafts', err.message);
		res.status(500).json({ message: 'Failed to list drafts' });
	}
});

router.get('/drafts/:id', async (req, res) => {
	const id = Number(req.params.id);
	const email = (req.headers['x-user-email'] || '').toString().toLowerCase();
	if (!email) {
		return res.status(400).json({ message: 'Email is required' });
	}
	if (!id || Number.isNaN(id)) {
		return res.status(400).json({ message: 'Invalid id' });
	}

	try {
		const [rows] = await pool.query(
			`SELECT id, user_email, request_type, data, upload_key, upload_url, approval_authority, status, created_at, updated_at FROM requests WHERE id = :id AND user_email = :email LIMIT 1`,
			{ id, email }
		);
		if (!rows.length) {
			return res.status(404).json({ message: 'Request not found' });
		}
		res.json(rows[0]);
	} catch (err) {
		console.error('Failed to fetch request', err.message);
		res.status(500).json({ message: 'Failed to fetch request' });
	}
});

router.put('/drafts/:id', async (req, res) => {
	const id = Number(req.params.id);
	const userEmail = (req.body?.userEmail || req.headers['x-user-email'] || '').toString().toLowerCase();
	const data = req.body?.data;
	const upload = req.body?.upload || {};
	const approvalAuthority = req.body?.approvalAuthority || '';
	let requestType = 'seed-research';

	try {
		requestType = resolveType(req.body?.requestType, 'seed-research');
	} catch (err) {
		return res.status(400).json({ message: err.message });
	}

	if (!id || Number.isNaN(id)) {
		return res.status(400).json({ message: 'Invalid id' });
	}
	if (!userEmail) {
		return res.status(400).json({ message: 'User email is required' });
	}
	if (!data) {
		return res.status(400).json({ message: 'Form data is required' });
	}

	try {
		const [existingRows] = await pool.query(
			`SELECT status, request_type FROM requests WHERE id = :id AND user_email = :user_email`,
			{ id, user_email: userEmail }
		);
		if (!existingRows.length) {
			return res.status(404).json({ message: 'Draft not found' });
		}
		if (existingRows[0].status !== 'draft') {
			return res.status(400).json({ message: 'Cannot edit an approved request' });
		}

		const payload = JSON.stringify(data);
		await pool.query(
			`UPDATE requests SET data = :data, upload_key = :upload_key, upload_url = :upload_url, approval_authority = :approval_authority, request_type = :request_type WHERE id = :id AND user_email = :user_email`,
			{
				data: payload,
				upload_key: upload.key || null,
				upload_url: upload.url || null,
				approval_authority: approvalAuthority,
				request_type: requestType,
				id,
				user_email: userEmail,
			}
		);

		res.json({ id, status: 'draft' });
	} catch (err) {
		console.error('Failed to update draft', err.message);
		res.status(500).json({ message: 'Failed to update draft' });
	}
});

module.exports = router;
