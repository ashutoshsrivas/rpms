'use strict';

const express = require('express');
const { pool } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const ExcelJS = require('exceljs');

const router = express.Router();

const ALLOWED_TYPES = ['seed-research', 'conference', 'workshop', 'fdp', 'laptop-grant', 'external-funding'];
const STATUS_ORDER = ['draft', 'submitted', 'in-review', 'approved', 'rejected'];

function toCsv(rows, headerOrder) {
	if (!rows?.length) {
		return (headerOrder || []).join(',');
	}
	const headers = headerOrder && headerOrder.length ? headerOrder : Object.keys(rows[0]);
	const escape = (val) => {
		if (val === null || val === undefined) return '';
		let str;
		if (val instanceof Date) {
			str = val.toISOString();
		} else if (typeof val === 'object') {
			str = JSON.stringify(val);
		} else {
			str = String(val);
		}
		// Neutralize spreadsheet formula injection: a leading =, +, -, @, or
		// tab/CR makes Excel/Sheets evaluate attacker-controlled cell text.
		if (/^[=+\-@\t\r]/.test(str)) {
			str = "'" + str;
		}
		if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
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

function parseData(raw) {
	if (!raw) return {};
	if (typeof raw === 'object') return raw;
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch (_err) {
		return {};
	}
}

function flattenValue(val) {
	if (val === null || val === undefined) return '';
	if (val instanceof Date) return val.toISOString();
	if (Array.isArray(val)) {
		return val
			.map((item) => (item && typeof item === 'object' ? JSON.stringify(item) : String(item)))
			.join('; ');
	}
	if (typeof val === 'object') return JSON.stringify(val);
	return val;
}

async function loadRequestsWithUsers(filters = {}) {
	const clauses = [];
	const params = {};
	if (Array.isArray(filters.types) && filters.types.length) {
		clauses.push(`r.request_type IN (${filters.types.map((_, i) => `:t${i}`).join(',')})`);
		filters.types.forEach((t, i) => {
			params[`t${i}`] = t;
		});
	}
	if (filters.status && STATUS_ORDER.includes(filters.status)) {
		clauses.push('r.status = :status');
		params.status = filters.status;
	}
	const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
	const [rows] = await pool.query(
		`SELECT r.id, r.user_email, r.request_type, r.status, r.approval_authority,
			r.upload_key, r.upload_url, r.data, r.created_at, r.updated_at,
			u.name AS owner_name, u.phone AS owner_phone, u.role AS owner_role
		 FROM requests r
		 LEFT JOIN users u ON u.email = r.user_email
		 ${where}
		 ORDER BY r.created_at DESC`,
		params
	);
	return rows.map((row) => ({ ...row, parsed: parseData(row.data) }));
}

function collectDataKeys(rows) {
	const keys = new Set();
	rows.forEach((r) => {
		Object.keys(r.parsed || {}).forEach((k) => keys.add(k));
	});
	return Array.from(keys).sort();
}

function requestRowForExport(row, dataKeys) {
	const base = {
		id: row.id,
		owner_email: row.user_email,
		owner_name: row.owner_name || '',
		owner_phone: row.owner_phone || '',
		owner_role: row.owner_role || '',
		request_type: row.request_type,
		status: row.status,
		approval_authority: row.approval_authority,
		upload_key: row.upload_key || '',
		upload_url: row.upload_url || '',
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
	dataKeys.forEach((k) => {
		base[`data.${k}`] = flattenValue(row.parsed?.[k]);
	});
	return base;
}

function requestBaseColumns() {
	return [
		{ header: 'ID', key: 'id', width: 8 },
		{ header: 'Owner Email', key: 'owner_email', width: 30 },
		{ header: 'Owner Name', key: 'owner_name', width: 24 },
		{ header: 'Owner Phone', key: 'owner_phone', width: 16 },
		{ header: 'Owner Role', key: 'owner_role', width: 10 },
		{ header: 'Type', key: 'request_type', width: 18 },
		{ header: 'Status', key: 'status', width: 12 },
		{ header: 'Approval Authority', key: 'approval_authority', width: 22 },
		{ header: 'Upload Key', key: 'upload_key', width: 32 },
		{ header: 'Upload URL', key: 'upload_url', width: 42 },
		{ header: 'Created', key: 'created_at', width: 22 },
		{ header: 'Updated', key: 'updated_at', width: 22 },
	];
}

function addRequestSheet(workbook, name, rows) {
	const dataKeys = collectDataKeys(rows);
	const sheet = workbook.addWorksheet((name || 'sheet').slice(0, 31));
	sheet.columns = [
		...requestBaseColumns(),
		...dataKeys.map((k) => ({ header: `data.${k}`, key: `data_${k}`, width: 24 })),
	];
	rows.forEach((row) => {
		const entry = {
			id: row.id,
			owner_email: row.user_email,
			owner_name: row.owner_name || '',
			owner_phone: row.owner_phone || '',
			owner_role: row.owner_role || '',
			request_type: row.request_type,
			status: row.status,
			approval_authority: row.approval_authority,
			upload_key: row.upload_key || '',
			upload_url: row.upload_url || '',
			created_at: row.created_at,
			updated_at: row.updated_at,
		};
		dataKeys.forEach((k) => {
			entry[`data_${k}`] = flattenValue(row.parsed?.[k]);
		});
		sheet.addRow(entry);
	});
	sheet.getRow(1).font = { bold: true };
	sheet.views = [{ state: 'frozen', ySplit: 1 }];
	return sheet;
}

function sendCsv(res, filename, csv) {
	res.setHeader('Content-Type', 'text/csv; charset=utf-8');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	// UTF-8 BOM so Excel opens special characters correctly
	res.send('﻿' + csv);
}

function sendXlsx(res, filename, buffer) {
	res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.send(Buffer.from(buffer));
}

// -------- Requests CSV (all requests, full data flattened) --------
router.get(['/requests', '/requests.csv'], authMiddleware, requireRole(['ADMIN']), async (req, res) => {
	try {
		const filters = {};
		if (req.query.type && req.query.type !== 'all') {
			const t = String(req.query.type);
			if (!ALLOWED_TYPES.includes(t)) {
				return res.status(400).json({ message: 'Unknown request type' });
			}
			filters.types = [t];
		}
		if (req.query.status && STATUS_ORDER.includes(String(req.query.status))) {
			filters.status = String(req.query.status);
		}
		const rows = await loadRequestsWithUsers(filters);
		const dataKeys = collectDataKeys(rows);
		const headers = [
			'id', 'owner_email', 'owner_name', 'owner_phone', 'owner_role',
			'request_type', 'status', 'approval_authority',
			'upload_key', 'upload_url', 'created_at', 'updated_at',
			...dataKeys.map((k) => `data.${k}`),
		];
		const exportRows = rows.map((r) => requestRowForExport(r, dataKeys));
		const filename = filters.types ? `requests-${filters.types[0]}.csv` : 'requests.csv';
		sendCsv(res, filename, toCsv(exportRows, headers));
	} catch (err) {
		console.error('Failed to export requests CSV', err.message);
		res.status(500).json({ message: 'Unable to export requests' });
	}
});

// -------- Users CSV (with activity counts) --------
router.get(['/users', '/users.csv'], authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
	try {
		const [rows] = await pool.query(
			`SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
				COALESCE(rc.total, 0) AS total_requests,
				COALESCE(rc.approved, 0) AS approved_requests,
				COALESCE(rc.rejected, 0) AS rejected_requests,
				COALESCE(rc.pending, 0) AS pending_requests,
				COALESCE(uc.uploads, 0) AS uploads_count
			 FROM users u
			 LEFT JOIN (
				SELECT user_email,
					COUNT(*) AS total,
					SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
					SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
					SUM(CASE WHEN status IN ('draft','submitted','in-review') THEN 1 ELSE 0 END) AS pending
				FROM requests GROUP BY user_email
			 ) rc ON rc.user_email = u.email
			 LEFT JOIN (
				SELECT uploader_email, COUNT(*) AS uploads
				FROM uploads GROUP BY uploader_email
			 ) uc ON uc.uploader_email = u.email
			 ORDER BY u.created_at DESC`
		);
		sendCsv(res, 'users.csv', toCsv(rows));
	} catch (err) {
		console.error('Failed to export users CSV', err.message);
		res.status(500).json({ message: 'Unable to export users' });
	}
});

// -------- Files CSV (all uploads with usage) --------
router.get('/files.csv', authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
	try {
		const [rows] = await pool.query(
			`SELECT u.id, u.original_name, u.s3_key, u.url, u.mimetype, u.size, u.uploader_email, u.created_at,
				(SELECT COUNT(*) FROM requests WHERE upload_key = u.s3_key) AS used_in_requests,
				(SELECT COUNT(*) FROM chat_files WHERE file_key = u.s3_key) AS used_in_chat,
				(SELECT COUNT(*) FROM post_approval_submissions WHERE file_key = u.s3_key) AS used_in_post_approval
			 FROM uploads u
			 ORDER BY u.created_at DESC`
		);
		sendCsv(res, 'files.csv', toCsv(rows));
	} catch (err) {
		console.error('Failed to export files CSV', err.message);
		res.status(500).json({ message: 'Unable to export files' });
	}
});

// -------- Chat messages CSV --------
router.get('/chat-messages.csv', authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
	try {
		const [rows] = await pool.query(
			`SELECT cm.id, cm.request_id, r.request_type, r.status AS request_status,
				r.user_email AS request_owner, cm.sender_email, cm.content, cm.created_at
			 FROM chat_messages cm
			 LEFT JOIN requests r ON r.id = cm.request_id
			 ORDER BY cm.created_at DESC`
		);
		sendCsv(res, 'chat-messages.csv', toCsv(rows));
	} catch (err) {
		console.error('Failed to export chat messages CSV', err.message);
		res.status(500).json({ message: 'Unable to export chat messages' });
	}
});

// -------- Post-approval requirements CSV --------
router.get('/post-approval.csv', authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
	try {
		const [rows] = await pool.query(
			`SELECT pr.id AS requirement_id, pr.request_id, r.request_type,
				r.user_email AS request_owner, pr.label, pr.status AS requirement_status,
				pr.created_by, pr.created_at,
				ps.id AS submission_id, ps.uploader_email, ps.file_key, ps.file_url,
				ps.note, ps.created_at AS submitted_at
			 FROM post_approval_requirements pr
			 LEFT JOIN requests r ON r.id = pr.request_id
			 LEFT JOIN post_approval_submissions ps ON ps.requirement_id = pr.id
			 ORDER BY pr.created_at DESC, ps.created_at DESC`
		);
		sendCsv(res, 'post-approval.csv', toCsv(rows));
	} catch (err) {
		console.error('Failed to export post-approval CSV', err.message);
		res.status(500).json({ message: 'Unable to export post-approval report' });
	}
});

// -------- Full workbook: everything --------
router.get(['/requests.xlsx', '/full.xlsx'], authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
	try {
		const parsedRequests = await loadRequestsWithUsers();

		const [users] = await pool.query(
			`SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
				COALESCE(rc.total, 0) AS total_requests,
				COALESCE(rc.approved, 0) AS approved_requests,
				COALESCE(rc.rejected, 0) AS rejected_requests,
				COALESCE(rc.pending, 0) AS pending_requests,
				COALESCE(uc.uploads, 0) AS uploads_count
			 FROM users u
			 LEFT JOIN (
				SELECT user_email,
					COUNT(*) AS total,
					SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
					SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
					SUM(CASE WHEN status IN ('draft','submitted','in-review') THEN 1 ELSE 0 END) AS pending
				FROM requests GROUP BY user_email
			 ) rc ON rc.user_email = u.email
			 LEFT JOIN (
				SELECT uploader_email, COUNT(*) AS uploads
				FROM uploads GROUP BY uploader_email
			 ) uc ON uc.uploader_email = u.email
			 ORDER BY u.created_at DESC`
		);

		const [files] = await pool.query(
			`SELECT request_id, chat_message_id, sender_email, file_key, file_url,
				is_private, is_admin_private, created_at
			 FROM chat_files ORDER BY created_at DESC`
		);

		const [uploads] = await pool.query(
			`SELECT id, original_name, s3_key, url, mimetype, size, uploader_email, created_at
			 FROM uploads ORDER BY created_at DESC`
		);

		const [messages] = await pool.query(
			`SELECT id, request_id, sender_email, content, created_at
			 FROM chat_messages ORDER BY created_at DESC`
		);

		const [requirements] = await pool.query(
			`SELECT id, request_id, label, status, created_by, created_at
			 FROM post_approval_requirements ORDER BY created_at DESC`
		);

		const [submissions] = await pool.query(
			`SELECT id, requirement_id, request_id, uploader_email, file_key, file_url, note, created_at
			 FROM post_approval_submissions ORDER BY created_at DESC`
		);

		const workbook = new ExcelJS.Workbook();
		workbook.creator = 'RPMS';
		workbook.created = new Date();

		// Summary sheet
		const summary = workbook.addWorksheet('Summary');
		summary.columns = [
			{ header: 'Metric', key: 'metric', width: 32 },
			{ header: 'Value', key: 'value', width: 18 },
		];
		summary.getRow(1).font = { bold: true };
		summary.addRow({ metric: 'Report Generated', value: new Date().toISOString() });
		summary.addRow({ metric: 'Total Users', value: users.length });
		summary.addRow({ metric: 'Total Requests', value: parsedRequests.length });
		STATUS_ORDER.forEach((s) => {
			summary.addRow({
				metric: `Requests: ${s}`,
				value: parsedRequests.filter((r) => r.status === s).length,
			});
		});
		ALLOWED_TYPES.forEach((t) => {
			summary.addRow({
				metric: `Type: ${t}`,
				value: parsedRequests.filter((r) => r.request_type === t).length,
			});
		});
		summary.addRow({ metric: 'Total Uploads', value: uploads.length });
		summary.addRow({ metric: 'Chat Messages', value: messages.length });
		summary.addRow({ metric: 'Chat Files', value: files.length });
		summary.addRow({ metric: 'Post-Approval Requirements', value: requirements.length });
		summary.addRow({ metric: 'Post-Approval Submissions', value: submissions.length });

		// All Requests sheet + one per type
		addRequestSheet(workbook, 'All Requests', parsedRequests);
		ALLOWED_TYPES.forEach((type) => {
			const subset = parsedRequests.filter((r) => r.request_type === type);
			if (subset.length) addRequestSheet(workbook, type, subset);
		});

		// Users sheet
		const usersSheet = workbook.addWorksheet('Users');
		usersSheet.columns = [
			{ header: 'ID', key: 'id', width: 8 },
			{ header: 'Name', key: 'name', width: 24 },
			{ header: 'Email', key: 'email', width: 30 },
			{ header: 'Phone', key: 'phone', width: 16 },
			{ header: 'Role', key: 'role', width: 10 },
			{ header: 'Created', key: 'created_at', width: 22 },
			{ header: 'Total Requests', key: 'total_requests', width: 14 },
			{ header: 'Approved', key: 'approved_requests', width: 12 },
			{ header: 'Rejected', key: 'rejected_requests', width: 12 },
			{ header: 'Pending', key: 'pending_requests', width: 12 },
			{ header: 'Uploads', key: 'uploads_count', width: 12 },
		];
		usersSheet.getRow(1).font = { bold: true };
		users.forEach((u) => usersSheet.addRow(u));

		// Files sheet
		const filesSheet = workbook.addWorksheet('Files');
		filesSheet.columns = [
			{ header: 'Request ID', key: 'request_id', width: 12 },
			{ header: 'Kind', key: 'kind', width: 16 },
			{ header: 'Sender', key: 'sender_email', width: 30 },
			{ header: 'File Key', key: 'file_key', width: 34 },
			{ header: 'File URL', key: 'file_url', width: 42 },
			{ header: 'Note', key: 'note', width: 32 },
			{ header: 'Created', key: 'created_at', width: 22 },
		];
		filesSheet.getRow(1).font = { bold: true };

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
		submissions.forEach((p) => {
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

		// Uploads library sheet
		const uploadsSheet = workbook.addWorksheet('Uploads Library');
		uploadsSheet.columns = [
			{ header: 'ID', key: 'id', width: 8 },
			{ header: 'Original Name', key: 'original_name', width: 32 },
			{ header: 'S3 Key', key: 's3_key', width: 40 },
			{ header: 'URL', key: 'url', width: 42 },
			{ header: 'MIME', key: 'mimetype', width: 22 },
			{ header: 'Size (bytes)', key: 'size', width: 14 },
			{ header: 'Uploader', key: 'uploader_email', width: 30 },
			{ header: 'Created', key: 'created_at', width: 22 },
		];
		uploadsSheet.getRow(1).font = { bold: true };
		uploads.forEach((u) => uploadsSheet.addRow(u));

		// Chat messages sheet
		const chatSheet = workbook.addWorksheet('Chat Messages');
		chatSheet.columns = [
			{ header: 'ID', key: 'id', width: 8 },
			{ header: 'Request ID', key: 'request_id', width: 12 },
			{ header: 'Sender', key: 'sender_email', width: 30 },
			{ header: 'Content', key: 'content', width: 70 },
			{ header: 'Created', key: 'created_at', width: 22 },
		];
		chatSheet.getRow(1).font = { bold: true };
		messages.forEach((m) => chatSheet.addRow(m));

		// Post-approval sheets
		const reqSheet = workbook.addWorksheet('Post-Approval Reqs');
		reqSheet.columns = [
			{ header: 'ID', key: 'id', width: 8 },
			{ header: 'Request ID', key: 'request_id', width: 12 },
			{ header: 'Label', key: 'label', width: 40 },
			{ header: 'Status', key: 'status', width: 14 },
			{ header: 'Created By', key: 'created_by', width: 30 },
			{ header: 'Created', key: 'created_at', width: 22 },
		];
		reqSheet.getRow(1).font = { bold: true };
		requirements.forEach((r) => reqSheet.addRow(r));

		const subSheet = workbook.addWorksheet('Post-Approval Subs');
		subSheet.columns = [
			{ header: 'ID', key: 'id', width: 8 },
			{ header: 'Requirement ID', key: 'requirement_id', width: 14 },
			{ header: 'Request ID', key: 'request_id', width: 12 },
			{ header: 'Uploader', key: 'uploader_email', width: 30 },
			{ header: 'File Key', key: 'file_key', width: 34 },
			{ header: 'File URL', key: 'file_url', width: 42 },
			{ header: 'Note', key: 'note', width: 32 },
			{ header: 'Created', key: 'created_at', width: 22 },
		];
		subSheet.getRow(1).font = { bold: true };
		submissions.forEach((s) => subSheet.addRow(s));

		const buffer = await workbook.xlsx.writeBuffer();
		sendXlsx(res, 'rpms-full-report.xlsx', buffer);
	} catch (err) {
		console.error('Failed to export full workbook', err.message);
		res.status(500).json({ message: 'Unable to export Excel' });
	}
});

// -------- Users workbook --------
router.get('/users.xlsx', authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
	try {
		const [users] = await pool.query(
			`SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
				COALESCE(rc.total, 0) AS total_requests,
				COALESCE(rc.approved, 0) AS approved_requests,
				COALESCE(rc.rejected, 0) AS rejected_requests,
				COALESCE(rc.pending, 0) AS pending_requests,
				COALESCE(uc.uploads, 0) AS uploads_count
			 FROM users u
			 LEFT JOIN (
				SELECT user_email,
					COUNT(*) AS total,
					SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
					SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
					SUM(CASE WHEN status IN ('draft','submitted','in-review') THEN 1 ELSE 0 END) AS pending
				FROM requests GROUP BY user_email
			 ) rc ON rc.user_email = u.email
			 LEFT JOIN (
				SELECT uploader_email, COUNT(*) AS uploads
				FROM uploads GROUP BY uploader_email
			 ) uc ON uc.uploader_email = u.email
			 ORDER BY u.created_at DESC`
		);

		const workbook = new ExcelJS.Workbook();
		workbook.creator = 'RPMS';
		const sheet = workbook.addWorksheet('Users');
		sheet.columns = [
			{ header: 'ID', key: 'id', width: 8 },
			{ header: 'Name', key: 'name', width: 24 },
			{ header: 'Email', key: 'email', width: 30 },
			{ header: 'Phone', key: 'phone', width: 16 },
			{ header: 'Role', key: 'role', width: 10 },
			{ header: 'Created', key: 'created_at', width: 22 },
			{ header: 'Total Requests', key: 'total_requests', width: 14 },
			{ header: 'Approved', key: 'approved_requests', width: 12 },
			{ header: 'Rejected', key: 'rejected_requests', width: 12 },
			{ header: 'Pending', key: 'pending_requests', width: 12 },
			{ header: 'Uploads', key: 'uploads_count', width: 12 },
		];
		sheet.getRow(1).font = { bold: true };
		users.forEach((u) => sheet.addRow(u));

		const buffer = await workbook.xlsx.writeBuffer();
		sendXlsx(res, 'users.xlsx', buffer);
	} catch (err) {
		console.error('Failed to export users workbook', err.message);
		res.status(500).json({ message: 'Unable to export Excel' });
	}
});

module.exports = router;
