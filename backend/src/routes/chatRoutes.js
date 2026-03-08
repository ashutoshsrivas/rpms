'use strict';

const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();
const ALLOWED_STATUSES = ['draft', 'submitted', 'in-review', 'approved', 'rejected'];
const ALLOWED_TYPES = ['seed-research', 'conference', 'workshop', 'fdp', 'laptop-grant', 'external-funding'];

async function findUserRole(email) {
	const normalized = (email || '').toString().toLowerCase();
	if (!normalized) return null;
	const [rows] = await pool.query(`SELECT role FROM users WHERE email = :email LIMIT 1`, { email: normalized });
	return rows[0]?.role || null;
}

async function requireHodActor(email, res) {
	const normalized = (email || '').toString().toLowerCase();
	if (!normalized) {
		res.status(400).json({ message: 'Email is required' });
		return null;
	}

	try {
		const [rows] = await pool.query(`SELECT role FROM users WHERE email = :email LIMIT 1`, { email: normalized });
		if (!rows.length) {
			res.status(403).json({ message: 'User not found' });
			return null;
		}
		if (!['HOD', 'ADMIN'].includes(rows[0].role)) {
			res.status(403).json({ message: 'Forbidden' });
			return null;
		}
		return rows[0];
	} catch (err) {
		console.error('Failed to verify user role', err);
		res.status(500).json({ message: 'Failed to verify user role' });
		return null;
	}
}

async function requireAdminActor(email, res) {
	const normalized = (email || '').toString().toLowerCase();
	if (!normalized) {
		res.status(400).json({ message: 'Email is required' });
		return null;
	}

	try {
		const [rows] = await pool.query(`SELECT role FROM users WHERE email = :email LIMIT 1`, { email: normalized });
		if (!rows.length) {
			res.status(403).json({ message: 'User not found' });
			return null;
		}
		if (rows[0].role !== 'ADMIN') {
			res.status(403).json({ message: 'Forbidden' });
			return null;
		}
		return rows[0];
	} catch (err) {
		console.error('Failed to verify admin role', err);
		res.status(500).json({ message: 'Failed to verify user role' });
		return null;
	}
}

function validateTransition(currentStatus, nextStatus, role) {
	const current = (currentStatus || '').toString().toLowerCase();
	const next = (nextStatus || '').toString().toLowerCase();

	if (!ALLOWED_STATUSES.includes(next)) {
		return 'Invalid status value';
	}

	if (current === 'approved' && !(role === 'ADMIN' && next === 'rejected')) {
		return 'Approved requests can only be rejected by Admin';
	}

	if (role === 'HOD') {
		const hodAllowed = [
			['draft', 'in-review'],
			['draft', 'submitted'],
			['in-review', 'submitted'],
		];
		const ok = hodAllowed.some(([from, to]) => from === current && to === next);
		return ok ? null : 'HOD can move drafts to in-review or submit to Admin';
	}

	if (role === 'ADMIN') {
		if (next === 'rejected') return null; // Admin can reject anytime
		if (current === 'submitted' && next === 'approved') return null; // Final approval step
		return 'Admin can approve submitted requests or reject';
	}

	return 'Forbidden';
}

router.get('/', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const actor = await requireHodActor(actorEmail, res);
	if (!actor) return;

	const statusParam = (req.query.status || '').toString().toLowerCase();
	const typeParam = (req.query.type || '').toString().toLowerCase();
	const ownerParam = (req.query.userEmail || req.query.user_email || '').toString().toLowerCase();
	const limit = Math.min(Number(req.query.limit) || 50, 200);
	const offset = Math.max(Number(req.query.offset) || 0, 0);

	const whereClauses = [];
	const params = [];

	if (statusParam) {
		const statuses = statusParam
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (statuses.some((s) => !ALLOWED_STATUSES.includes(s))) {
			return res.status(400).json({ message: 'Invalid status filter' });
		}
		if (statuses.length) {
			whereClauses.push(`status IN (${statuses.map(() => '?').join(',')})`);
			params.push(...statuses);
		}
	}

	if (typeParam) {
		const types = typeParam
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
		if (types.some((t) => !ALLOWED_TYPES.includes(t))) {
			return res.status(400).json({ message: 'Invalid type filter' });
		}
		if (types.length) {
			whereClauses.push(`request_type IN (${types.map(() => '?').join(',')})`);
			params.push(...types);
		}
	}

	if (ownerParam) {
		whereClauses.push('user_email = ?');
		params.push(ownerParam);
	}

	const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
	const sql = `SELECT id, user_email, request_type, data, upload_key, upload_url, approval_authority, status, created_at, updated_at FROM requests ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
	params.push(limit, offset);

	try {
		const [rows] = await pool.query(sql, params);
		res.json(rows);
	} catch (err) {
		console.error('Failed to list requests for HOD', err);
		res.status(500).json({ message: 'Failed to list requests' });
	}
});

router.get('/:requestId', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const actor = await requireHodActor(actorEmail, res);
	if (!actor) return;

	const requestId = Number(req.params.requestId);
	if (!requestId || Number.isNaN(requestId)) {
		return res.status(400).json({ message: 'Invalid request id' });
	}

	try {
		const [rows] = await pool.query(
			`SELECT id, user_email, request_type, data, upload_key, upload_url, approval_authority, status, created_at, updated_at FROM requests WHERE id = :id LIMIT 1`,
			{ id: requestId }
		);
		if (!rows.length) {
			return res.status(404).json({ message: 'Request not found' });
		}
		res.json(rows[0]);
	} catch (err) {
		console.error('Failed to fetch request', err);
		res.status(500).json({ message: 'Failed to fetch request' });
	}
});

router.patch('/:requestId/status', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const actor = await requireHodActor(actorEmail, res);
	if (!actor) return;

	const requestId = Number(req.params.requestId);
	const nextStatus = (req.body?.status || '').toString().toLowerCase();

	if (!requestId || Number.isNaN(requestId)) {
		return res.status(400).json({ message: 'Invalid request id' });
	}

	try {
		const [existing] = await pool.query(
			`SELECT id, status FROM requests WHERE id = :id LIMIT 1`,
			{ id: requestId }
		);
		if (!existing.length) {
			return res.status(404).json({ message: 'Request not found' });
		}

		const errorMessage = validateTransition(existing[0].status, nextStatus, actor.role);
		if (errorMessage) {
			return res.status(400).json({ message: errorMessage });
		}

		await pool.query(`UPDATE requests SET status = :status WHERE id = :id`, {
			status: nextStatus,
			id: requestId,
		});
		const [updated] = await pool.query(
			`SELECT id, user_email, request_type, data, upload_key, upload_url, approval_authority, status, created_at, updated_at FROM requests WHERE id = :id LIMIT 1`,
			{ id: requestId }
		);
		res.json(updated[0]);
	} catch (err) {
		console.error('Failed to update request status', err);
		res.status(500).json({ message: 'Failed to update status' });
	}
});

// HOD/Admin private documents (not visible to requesters)
router.get('/:requestId/private-files', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const actor = await requireHodActor(actorEmail, res);
	if (!actor) return;

	const requestId = Number(req.params.requestId);
	if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ message: 'Invalid request id' });

	try {
		const [rows] = await pool.query(
			`SELECT id, request_id, sender_email, file_key, file_url, created_at FROM chat_files WHERE request_id = :request_id AND is_private = 1 AND is_admin_private = 0 ORDER BY created_at DESC`,
			{ request_id: requestId }
		);
		res.json(rows);
	} catch (err) {
		console.error('Failed to list private files', err);
		res.status(500).json({ message: 'Failed to load private files' });
	}
});

router.post('/:requestId/private-files', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const actor = await requireHodActor(actorEmail, res);
	if (!actor) return;

	const requestId = Number(req.params.requestId);
	const upload = req.body?.upload || null;
	if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ message: 'Invalid request id' });
	if (!upload || !upload.key || !upload.url) return res.status(400).json({ message: 'Upload key and url are required' });

	try {
		await pool.query(
			`INSERT INTO chat_files (request_id, chat_message_id, sender_email, file_key, file_url, is_private, is_admin_private) VALUES (:request_id, NULL, :sender_email, :file_key, :file_url, 1, 0)`,
			{
				request_id: requestId,
				sender_email: actorEmail,
				file_key: upload.key,
				file_url: upload.url,
			}
		);
		const [rows] = await pool.query(
			`SELECT id, request_id, sender_email, file_key, file_url, created_at FROM chat_files WHERE request_id = :request_id AND is_private = 1 AND is_admin_private = 0 ORDER BY created_at DESC`,
			{ request_id: requestId }
		);
		res.status(201).json(rows);
	} catch (err) {
		console.error('Failed to save private file', err);
		res.status(500).json({ message: 'Failed to save private file' });
	}
});

// Admin-only statements/documents
router.get('/:requestId/admin-files', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const actor = await requireAdminActor(actorEmail, res);
	if (!actor) return;

	const requestId = Number(req.params.requestId);
	if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ message: 'Invalid request id' });

	try {
		const [rows] = await pool.query(
			`SELECT id, request_id, sender_email, file_key, file_url, created_at FROM chat_files WHERE request_id = :request_id AND is_admin_private = 1 ORDER BY created_at DESC`,
			{ request_id: requestId }
		);
		res.json(rows);
	} catch (err) {
		console.error('Failed to list admin files', err);
		res.status(500).json({ message: 'Failed to load admin files' });
	}
});

router.post('/:requestId/admin-files', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const actor = await requireAdminActor(actorEmail, res);
	if (!actor) return;

	const requestId = Number(req.params.requestId);
	const upload = req.body?.upload || null;
	if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ message: 'Invalid request id' });
	if (!upload || !upload.key || !upload.url) return res.status(400).json({ message: 'Upload key and url are required' });

	try {
		await pool.query(
			`INSERT INTO chat_files (request_id, chat_message_id, sender_email, file_key, file_url, is_private, is_admin_private) VALUES (:request_id, NULL, :sender_email, :file_key, :file_url, 1, 1)`,
			{
				request_id: requestId,
				sender_email: actorEmail,
				file_key: upload.key,
				file_url: upload.url,
			}
		);
		const [rows] = await pool.query(
			`SELECT id, request_id, sender_email, file_key, file_url, created_at FROM chat_files WHERE request_id = :request_id AND is_admin_private = 1 ORDER BY created_at DESC`,
			{ request_id: requestId }
		);
		res.status(201).json(rows);
	} catch (err) {
		console.error('Failed to save admin file', err);
		res.status(500).json({ message: 'Failed to save admin file' });
	}
});

// Post-approval document requirements
router.get('/:requestId/post-approval/requirements', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const requestId = Number(req.params.requestId);

	if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ message: 'Invalid request id' });

	try {
		const [requests] = await pool.query(
			`SELECT id, user_email, status FROM requests WHERE id = :id LIMIT 1`,
			{ id: requestId }
		);
		if (!requests.length) return res.status(404).json({ message: 'Request not found' });
		const ownerEmail = requests[0].user_email;
		const role = await findUserRole(actorEmail);
		if (!role && actorEmail !== ownerEmail) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		if (actorEmail !== ownerEmail && !['ADMIN', 'HOD'].includes(role || '')) {
			return res.status(403).json({ message: 'Forbidden' });
		}

		const [rows] = await pool.query(
			`SELECT r.id, r.request_id, r.label, r.status, r.created_by, r.created_at,
				s.id AS submission_id, s.file_key, s.file_url, s.uploader_email, s.note, s.created_at AS submitted_at
			FROM post_approval_requirements r
			LEFT JOIN post_approval_submissions s ON s.requirement_id = r.id
			WHERE r.request_id = :request_id
			ORDER BY r.created_at ASC, s.created_at DESC`,
			{ request_id: requestId }
		);
		res.json(rows);
	} catch (err) {
		console.error('Failed to list post-approval requirements', err);
		res.status(500).json({ message: 'Failed to list requirements' });
	}
});

router.post('/:requestId/post-approval/requirements', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const requestId = Number(req.params.requestId);
	if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ message: 'Invalid request id' });

	const actor = await requireAdminActor(actorEmail, res);
	if (!actor) return;

	const label = (req.body?.label || '').toString().trim();
	if (!label) return res.status(400).json({ message: 'Label is required' });

	try {
		const [requests] = await pool.query(`SELECT status FROM requests WHERE id = :id LIMIT 1`, { id: requestId });
		if (!requests.length) return res.status(404).json({ message: 'Request not found' });
		if ((requests[0].status || '').toString().toLowerCase() !== 'approved') {
			return res.status(400).json({ message: 'Post-approval documents can be requested only after approval' });
		}

		const [result] = await pool.query(
			`INSERT INTO post_approval_requirements (request_id, label, created_by) VALUES (:request_id, :label, :created_by)`,
			{ request_id: requestId, label, created_by: actorEmail }
		);
		res.status(201).json({ id: result.insertId, request_id: requestId, label, status: 'pending' });
	} catch (err) {
		console.error('Failed to create requirement', err);
		res.status(500).json({ message: 'Failed to create requirement' });
	}
});

router.post('/:requestId/post-approval/submissions', async (req, res) => {
	const actorEmail = (req.headers['x-user-email'] || '').toString().toLowerCase();
	const requestId = Number(req.params.requestId);
	const requirementId = Number(req.body?.requirementId);
	const upload = req.body?.upload || {};
	const note = (req.body?.note || '').toString().trim();

	if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ message: 'Invalid request id' });
	if (!requirementId || Number.isNaN(requirementId)) return res.status(400).json({ message: 'Invalid requirement id' });
	if (!upload.key || !upload.url) return res.status(400).json({ message: 'Upload key and url are required' });

	try {
		const [requests] = await pool.query(
			`SELECT user_email, status FROM requests WHERE id = :id LIMIT 1`,
			{ id: requestId }
		);
		if (!requests.length) return res.status(404).json({ message: 'Request not found' });
		const ownerEmail = (requests[0].user_email || '').toString().toLowerCase();
		if (ownerEmail !== actorEmail) {
			return res.status(403).json({ message: 'Only the request owner can submit documents' });
		}
		if ((requests[0].status || '').toString().toLowerCase() !== 'approved') {
			return res.status(400).json({ message: 'Request must be approved before submitting follow-up documents' });
		}

		const [reqRows] = await pool.query(
			`SELECT id, request_id, status FROM post_approval_requirements WHERE id = :id AND request_id = :request_id LIMIT 1`,
			{ id: requirementId, request_id: requestId }
		);
		if (!reqRows.length) return res.status(404).json({ message: 'Requirement not found' });

		const [result] = await pool.query(
			`INSERT INTO post_approval_submissions (requirement_id, request_id, uploader_email, file_key, file_url, note) VALUES (:requirement_id, :request_id, :uploader_email, :file_key, :file_url, :note)`,
			{
				requirement_id: requirementId,
				request_id: requestId,
				uploader_email: actorEmail,
				file_key: upload.key,
				file_url: upload.url,
				note,
			}
		);

		await pool.query(
			`UPDATE post_approval_requirements SET status = 'submitted' WHERE id = :id`,
			{ id: requirementId }
		);

		res.status(201).json({
			id: result.insertId,
			requirement_id: requirementId,
			request_id: requestId,
			uploader_email: actorEmail,
			file_key: upload.key,
			file_url: upload.url,
			note,
		});
	} catch (err) {
		console.error('Failed to submit post-approval document', err);
		res.status(500).json({ message: 'Failed to submit document' });
	}
});

router.get('/:requestId/chat', async (req, res) => {
	const requestId = Number(req.params.requestId);
	const email = (req.headers['x-user-email'] || '').toString().toLowerCase();
	if (!email) return res.status(400).json({ message: 'Email is required' });
	if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ message: 'Invalid request id' });

	try {
		const [messages] = await pool.query(
			`SELECT id, request_id, sender_email, content, created_at FROM chat_messages WHERE request_id = :request_id ORDER BY created_at ASC`,
			{ request_id: requestId }
		);
		const [files] = await pool.query(
			`SELECT id, request_id, chat_message_id, sender_email, file_key, file_url, is_private, created_at FROM chat_files WHERE request_id = :request_id AND (is_private IS NULL OR is_private = 0) ORDER BY created_at ASC`,
			{ request_id: requestId }
		);
		const attachmentsByMessage = files.reduce((acc, file) => {
			const key = file.chat_message_id || 0;
			acc[key] = acc[key] || [];
			acc[key].push(file);
			return acc;
		}, {});
		const response = messages.map((msg) => ({
			...msg,
			attachments: attachmentsByMessage[msg.id] || [],
		}));
		// orphan files (uploaded without message id)
		const orphanAttachments = attachmentsByMessage[0] || [];
		res.json({ messages: response, orphanAttachments });
	} catch (err) {
		console.error('Failed to load chat', err);
		res.status(500).json({ message: 'Failed to load chat' });
	}
});

router.post('/:requestId/chat', async (req, res) => {
	const requestId = Number(req.params.requestId);
	const email = (req.body?.senderEmail || req.headers['x-user-email'] || '').toString().toLowerCase();
	const content = (req.body?.content || '').toString();
	const upload = req.body?.upload || null;
	if (!email) return res.status(400).json({ message: 'Email is required' });
	if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ message: 'Invalid request id' });
	if (!content && !upload) return res.status(400).json({ message: 'Message content or attachment is required' });

	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		let messageId = null;
		if (content) {
			const [result] = await connection.query(
				`INSERT INTO chat_messages (request_id, sender_email, content) VALUES (:request_id, :sender_email, :content)`,
				{ request_id: requestId, sender_email: email, content }
			);
			messageId = result.insertId;
		}
		if (upload && upload.key && upload.url) {
			await connection.query(
				`INSERT INTO chat_files (request_id, chat_message_id, sender_email, file_key, file_url, is_private) VALUES (:request_id, :chat_message_id, :sender_email, :file_key, :file_url, 0)`,
				{
					request_id: requestId,
					chat_message_id: messageId,
					sender_email: email,
					file_key: upload.key,
					file_url: upload.url,
					is_private: 0,
				}
			);
		}
		await connection.commit();
		res.status(201).json({ messageId, status: 'ok' });
	} catch (err) {
		await connection.rollback();
		console.error('Failed to send chat message', err);
		res.status(500).json({ message: 'Failed to send message' });
	} finally {
		connection.release();
	}
});

module.exports = router;
