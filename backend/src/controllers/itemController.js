'use strict';

const { pool } = require('../config/db');

async function listItems(_req, res) {
	try {
		const [rows] = await pool.query(
			'SELECT id, name, created_at FROM items ORDER BY created_at DESC'
		);
		res.json(rows);
	} catch (err) {
		console.error('Failed to fetch items:', err.message);
		res.status(500).json({ message: 'Unable to fetch items' });
	}
}

async function createItem(req, res) {
	const { name } = req.body || {};

	if (!name || !name.trim()) {
		res.status(400).json({ message: 'Name is required' });
		return;
	}

	try {
		const [result] = await pool.query(
			'INSERT INTO items (name) VALUES (:name)',
			{ name: name.trim() }
		);
		res.status(201).json({ id: result.insertId, name: name.trim() });
	} catch (err) {
		console.error('Failed to create item:', err.message);
		res.status(500).json({ message: 'Unable to create item' });
	}
}

module.exports = { listItems, createItem };
