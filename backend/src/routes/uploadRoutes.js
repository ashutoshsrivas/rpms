'use strict';

const express = require('express');
const { pool } = require('../config/db');
const { upload, s3UploadMiddleware } = require('../middleware/uploadS3');

const router = express.Router();

router.post('/', upload.single('file'), s3UploadMiddleware, async (req, res) => {
	if (!req.file || !req.uploadedFile) {
		return res.status(400).json({ message: 'No file uploaded' });
	}

	const { originalName, mimetype, size, key, url } = req.uploadedFile;
	const uploaderEmail = (req.body?.uploaderEmail || req.headers['x-user-email'] || '').toString().toLowerCase();

	if (!uploaderEmail) {
		return res.status(400).json({ message: 'Uploader email is required' });
	}

	try {
		await pool.query(
			`INSERT INTO uploads (original_name, s3_key, url, mimetype, size, uploader_email) VALUES (:original_name, :s3_key, :url, :mimetype, :size, :uploader_email)`,
			{
				original_name: originalName,
				s3_key: key,
				url,
				mimetype,
				size,
				uploader_email: uploaderEmail,
			}
		);

		res.status(201).json({ url, key, mimetype, size, uploader_email: uploaderEmail });
	} catch (err) {
		console.error('Failed to save upload metadata', err.message);
		res.status(500).json({ message: 'Failed to save upload' });
	}
});

router.get('/', async (req, res) => {
	const emailFilter = (req.query.email || req.headers['x-user-email'] || '').toString().toLowerCase();
	if (!emailFilter) {
		return res.status(400).json({ message: 'Email is required to list uploads' });
	}
	const where = 'WHERE uploader_email = :email';
	try {
		const [rows] = await pool.query(
			`SELECT id, original_name, s3_key AS \`key\`, url, mimetype, size, uploader_email, created_at FROM uploads ${where} ORDER BY created_at DESC LIMIT 50`,
			{ email: emailFilter }
		);
		res.json(rows);
	} catch (err) {
		console.error('Failed to list uploads', err.message);
		res.status(500).json({ message: 'Failed to list uploads' });
	}
});

module.exports = router;
