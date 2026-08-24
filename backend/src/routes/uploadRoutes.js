'use strict';

const express = require('express');
const { pool } = require('../config/db');
const { upload, s3UploadMiddleware } = require('../middleware/uploadS3');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

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

// Admin-only: List all files in the system
router.get('/admin/all', authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
	try {
		const [uploads] = await pool.query(
			`SELECT id, original_name, s3_key AS \`key\`, url, mimetype, size, uploader_email, created_at 
			 FROM uploads 
			 ORDER BY created_at DESC`
		);

		// For each file, get usage statistics
		const filesWithUsage = await Promise.all(
			uploads.map(async (file) => {
				// Check usage in requests
				const [requestRows] = await pool.query(
					`SELECT id, request_type, status FROM requests WHERE upload_key = :key`,
					{ key: file.key }
				);

				// Check usage in chat_files
				const [chatFileRows] = await pool.query(
					`SELECT cf.id, r.status, r.request_type
					 FROM chat_files cf
					 JOIN requests r ON cf.request_id = r.id
					 WHERE cf.file_key = :key`,
					{ key: file.key }
				);

				// Check usage in post_approval_submissions
				const [postApprovalRows] = await pool.query(
					`SELECT ps.id, r.status, r.request_type
					 FROM post_approval_submissions ps
					 JOIN requests r ON ps.request_id = r.id
					 WHERE ps.file_key = :key`,
					{ key: file.key }
				);

				// Count by status
				const usageByStatus = {
					draft: 0,
					submitted: 0,
					'in-review': 0,
					approved: 0,
					rejected: 0,
				};

				const allUsages = [
					...requestRows,
					...chatFileRows,
					...postApprovalRows,
				];

				allUsages.forEach((row) => {
					const status = row.status || 'draft';
					usageByStatus[status] = (usageByStatus[status] || 0) + 1;
				});

				const totalUsages = allUsages.length;
				const hasApprovedUsage = usageByStatus.approved > 0;

				return {
					...file,
					usage: {
						total: totalUsages,
						byStatus: usageByStatus,
						hasApprovedUsage,
						canDelete: !hasApprovedUsage,
					},
				};
			})
		);

		res.json(filesWithUsage);
	} catch (err) {
		console.error('Failed to list all files', err.message);
		res.status(500).json({ message: 'Failed to list files' });
	}
});

// Check file usage across the system
router.post('/check-usage', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const fileKey = req.body?.key;

	if (!actorEmail) {
		return res.status(400).json({ message: 'Email is required' });
	}

	if (!fileKey) {
		return res.status(400).json({ message: 'File key is required' });
	}

	try {
		// Check if file exists and belongs to user
		const [uploadRows] = await pool.query(
			`SELECT id, s3_key, uploader_email FROM uploads WHERE s3_key = :key LIMIT 1`,
			{ key: fileKey }
		);

		if (!uploadRows.length) {
			return res.status(404).json({ message: 'File not found' });
		}

		if (uploadRows[0].uploader_email !== actorEmail) {
			return res.status(403).json({ message: 'You do not have permission to check this file' });
		}

		// Check usage in requests table
		const [requestRows] = await pool.query(
			`SELECT id, request_type, status, user_email FROM requests WHERE upload_key = :key`,
			{ key: fileKey }
		);

		// Check usage in chat_files table
		const [chatFileRows] = await pool.query(
			`SELECT cf.id, cf.request_id, r.status, r.request_type
			 FROM chat_files cf
			 JOIN requests r ON cf.request_id = r.id
			 WHERE cf.file_key = :key`,
			{ key: fileKey }
		);

		// Check usage in post_approval_submissions table
		const [postApprovalRows] = await pool.query(
			`SELECT ps.id, ps.request_id, r.status, r.request_type
			 FROM post_approval_submissions ps
			 JOIN requests r ON ps.request_id = r.id
			 WHERE ps.file_key = :key`,
			{ key: fileKey }
		);

		// Count by status
		const usageByStatus = {
			draft: 0,
			submitted: 0,
			'in-review': 0,
			approved: 0,
			rejected: 0,
		};

		const allUsages = [
			...requestRows,
			...chatFileRows,
			...postApprovalRows,
		];

		allUsages.forEach((row) => {
			const status = row.status || 'draft';
			usageByStatus[status] = (usageByStatus[status] || 0) + 1;
		});

		const totalUsages = allUsages.length;
		const hasApprovedUsage = usageByStatus.approved > 0;

		res.json({
			totalUsages,
			usageByStatus,
			hasApprovedUsage,
			canDelete: !hasApprovedUsage,
			details: {
				inRequests: requestRows.length,
				inChatFiles: chatFileRows.length,
				inPostApproval: postApprovalRows.length,
			},
		});
	} catch (err) {
		console.error('Failed to check file usage', err.message);
		res.status(500).json({ message: 'Failed to check file usage' });
	}
});

// Delete a file
router.delete('/', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const fileKey = req.body?.key;

	if (!actorEmail) {
		return res.status(400).json({ message: 'Email is required' });
	}

	if (!fileKey) {
		return res.status(400).json({ message: 'File key is required' });
	}

	try {
		// Check user role
		const [userRows] = await pool.query(
			`SELECT role FROM users WHERE email = :email LIMIT 1`,
			{ email: actorEmail }
		);

		const isAdmin = userRows.length > 0 && userRows[0].role === 'ADMIN';

		// Check if file exists and belongs to user (or user is admin)
		const [uploadRows] = await pool.query(
			`SELECT id, s3_key, uploader_email FROM uploads WHERE s3_key = :key LIMIT 1`,
			{ key: fileKey }
		);

		if (!uploadRows.length) {
			return res.status(404).json({ message: 'File not found' });
		}

		if (!isAdmin && uploadRows[0].uploader_email !== actorEmail) {
			return res.status(403).json({ message: 'You do not have permission to delete this file' });
		}

		// Check if file is used in any approved requests
		const [approvedUsage] = await pool.query(
			`SELECT COUNT(*) as count FROM (
				SELECT id FROM requests WHERE upload_key = :key AND status = 'approved'
				UNION ALL
				SELECT cf.id FROM chat_files cf
				JOIN requests r ON cf.request_id = r.id
				WHERE cf.file_key = :key AND r.status = 'approved'
				UNION ALL
				SELECT ps.id FROM post_approval_submissions ps
				JOIN requests r ON ps.request_id = r.id
				WHERE ps.file_key = :key AND r.status = 'approved'
			) AS all_usages`,
			{ key: fileKey }
		);

		if (approvedUsage[0].count > 0) {
			return res.status(400).json({ 
				message: 'Cannot delete file: it is used in approved documents',
				usageCount: approvedUsage[0].count
			});
		}

		// Delete the file record from database
		await pool.query(
			`DELETE FROM uploads WHERE s3_key = :key`,
			{ key: fileKey }
		);

		// Note: You may also want to delete from S3 here
		// For now, we're just removing the database record

		res.json({ message: 'File deleted successfully' });
	} catch (err) {
		console.error('Failed to delete file', err.message);
		res.status(500).json({ message: 'Failed to delete file' });
	}
});

// Admin-only: Update file metadata
router.patch('/admin/:id', authMiddleware, requireRole(['ADMIN']), async (req, res) => {
	const fileId = Number(req.params.id);
	const { original_name } = req.body;

	if (!fileId || Number.isNaN(fileId)) {
		return res.status(400).json({ message: 'Invalid file ID' });
	}

	if (!original_name || typeof original_name !== 'string') {
		return res.status(400).json({ message: 'Original name is required' });
	}

	try {
		await pool.query(
			`UPDATE uploads SET original_name = :original_name WHERE id = :id`,
			{ original_name, id: fileId }
		);

		const [updated] = await pool.query(
			`SELECT id, original_name, s3_key AS \`key\`, url, mimetype, size, uploader_email, created_at FROM uploads WHERE id = :id LIMIT 1`,
			{ id: fileId }
		);

		if (!updated.length) {
			return res.status(404).json({ message: 'File not found' });
		}

		res.json(updated[0]);
	} catch (err) {
		console.error('Failed to update file', err.message);
		res.status(500).json({ message: 'Failed to update file' });
	}
});

module.exports = router;
