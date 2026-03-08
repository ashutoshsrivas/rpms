'use strict';

const { pool } = require('../config/db');

async function health(_req, res) {
	try {
		const [rows] = await pool.query('SELECT 1 AS ok');
		res.json({ status: 'ok', db: rows?.[0]?.ok === 1 });
	} catch (err) {
		console.error('DB health check failed:', err.message);
		res.status(500).json({ status: 'error', message: err.message });
	}
}

module.exports = { health };
