'use strict';

const express = require('express');
const { pool } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const ExcelJS = require('exceljs');

const router = express.Router();

function toCsv(rows) {
	if (!rows?.length) return '';
	const headers = Object.keys(rows[0]);
	const escape = (val) => {
		if (val === null || val === undefined) return '';
		const str = String(val);
		if (str.includes('"') || str.includes(',') || str.includes('\n')) {
			return '"' + str.replace(/"/g, '""') + '"';
		}
		return str;
	};
	const lines = [headers.join(',')];
	for (const row of rows) {
		lines.push(headers.map((h) => escape(row[h])).join(','));
	}
	return lines.join('\n');
}

router.get('/requests', authMiddleware, requireRole(['ADMIN']), async (req, res) => {
	const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 5000);
	try {
		const [rows] = await pool.query(
			`SELECT id, user_email, request_type, status, approval_authority, created_at, updated_at
			 FROM requests
			 ORDER BY created_at DESC
			 LIMIT :limit`,
			{ limit }
		);
		const csv = toCsv(rows);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename="requests.csv"');
		res.send(csv);
	} catch (err) {
		console.error('Failed to export requests', err.message);
		res.status(500).json({ message: 'Unable to export requests' });
	}
});

router.get('/users', authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
	try {
		const [rows] = await pool.query(
			`SELECT id, name, email, phone, role, created_at
			 FROM users
			 ORDER BY created_at DESC`
		);
		const csv = toCsv(rows);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
		res.send(csv);
	} catch (err) {
		console.error('Failed to export users', err.message);
		res.status(500).json({ message: 'Unable to export users' });
	}
});

router.get('/requests.xlsx', authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
	try {
		const [requests] = await pool.query(
			`SELECT id, user_email, request_type, status, approval_authority, upload_key, upload_url, data, created_at, updated_at
			 FROM requests
			 ORDER BY created_at DESC`
		);

		const [files] = await pool.query(
			`SELECT request_id, sender_email, file_key, file_url, is_private, is_admin_private, created_at
			 FROM chat_files
			 ORDER BY created_at DESC`
		);

		const [postSubs] = await pool.query(
			`SELECT request_id, uploader_email, file_key, file_url, note, created_at
			 FROM post_approval_submissions
			 ORDER BY created_at DESC`
		);

		// Gather data keys
		const dataKeys = new Set();
		const parsedRequests = requests.map((row) => {
			let parsed = {};
			try {
				parsed = JSON.parse(row.data || '{}') || {};
			} catch (err) {
				parsed = {};
			}
			Object.keys(parsed || {}).forEach((k) => dataKeys.add(k));
			return { ...row, parsed };
		});

		const workbook = new ExcelJS.Workbook();
		const baseColumns = [
			{ header: 'ID', key: 'id', width: 10 },
			{ header: 'Owner', key: 'user_email', width: 28 },
			{ header: 'Type', key: 'request_type', width: 18 },
			{ header: 'Status', key: 'status', width: 14 },
			{ header: 'Approval Authority', key: 'approval_authority', width: 22 },
			{ header: 'Upload Key', key: 'upload_key', width: 30 },
			{ header: 'Upload URL', key: 'upload_url', width: 40 },
			{ header: 'Created', key: 'created_at', width: 22 },
			{ header: 'Updated', key: 'updated_at', width: 22 },
		];

		const dataColumns = Array.from(dataKeys).map((k) => ({ header: `data.${k}`, key: `data_${k}`, width: 24 }));

		function addSheet(name, rows) {
			const sheet = workbook.addWorksheet(name);
			sheet.columns = [...baseColumns, ...dataColumns];
			rows.forEach((row) => {
				const dataEntries = {};
				dataColumns.forEach((col) => {
					const key = col.key.replace('data_', '');
					const val = row.parsed?.[key];
					if (val === null || val === undefined) {
						dataEntries[col.key] = '';
					} else if (typeof val === 'object') {
						dataEntries[col.key] = JSON.stringify(val);
					} else {
						dataEntries[col.key] = val;
					}
				});
				sheet.addRow({
					id: row.id,
					user_email: row.user_email,
					request_type: row.request_type,
					status: row.status,
					approval_authority: row.approval_authority,
					upload_key: row.upload_key,
					upload_url: row.upload_url,
					created_at: row.created_at,
					updated_at: row.updated_at,
					...dataEntries,
				});
			});
		}

		addSheet('All Requests', parsedRequests);

		const types = Array.from(new Set(parsedRequests.map((r) => r.request_type || 'unknown')));
		types.forEach((type) => {
			const rows = parsedRequests.filter((r) => (r.request_type || 'unknown') === type);
			addSheet(type, rows);
		});

		// Files sheet
		const filesSheet = workbook.addWorksheet('Files');
		filesSheet.columns = [
			{ header: 'Request ID', key: 'request_id', width: 12 },
			{ header: 'Kind', key: 'kind', width: 16 },
			{ header: 'Sender', key: 'sender_email', width: 28 },
			{ header: 'File Key', key: 'file_key', width: 32 },
			{ header: 'File URL', key: 'file_url', width: 42 },
			{ header: 'Note', key: 'note', width: 32 },
			{ header: 'Created', key: 'created_at', width: 22 },
		];

		parsedRequests.forEach((req) => {
			if (req.upload_url || req.upload_key) {
				filesSheet.addRow({
					request_id: req.id,
					kind: 'primary',
					sender_email: req.user_email,
					file_key: req.upload_key || '',
					file_url: req.upload_url || '',
					created_at: req.created_at,
				});
			}
		});

		files.forEach((f) => {
			filesSheet.addRow({
				request_id: f.request_id,
				kind: f.is_admin_private ? 'admin-private' : f.is_private ? 'private' : 'chat',
				sender_email: f.sender_email,
				file_key: f.file_key,
				file_url: f.file_url,
				created_at: f.created_at,
			});
		});

		postSubs.forEach((p) => {
			filesSheet.addRow({
				request_id: p.request_id,
				kind: 'post-approval',
				sender_email: p.uploader_email,
				file_key: p.file_key,
				file_url: p.file_url,
				note: p.note,
				created_at: p.created_at,
			});
		});

		const buffer = await workbook.xlsx.writeBuffer();
		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		res.setHeader('Content-Disposition', 'attachment; filename="requests.xlsx"');
		res.send(Buffer.from(buffer));
	} catch (err) {
		console.error('Failed to export requests workbook', err.message);
		res.status(500).json({ message: 'Unable to export Excel' });
	}
});

module.exports = router;
