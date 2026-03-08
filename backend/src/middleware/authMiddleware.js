'use strict';

const { verifyToken } = require('../utils/jwt');

function authMiddleware(req, res, next) {
	const header = req.headers.authorization;
	if (!header || !header.startsWith('Bearer ')) {
		res.status(401).json({ message: 'Unauthorized' });
		return;
	}

	const token = header.split(' ')[1];

	try {
		const payload = verifyToken(token);
		req.user = { id: payload.sub, email: payload.email, role: payload.role || 'USER' };
		next();
	} catch (err) {
		res.status(401).json({ message: 'Invalid or expired token' });
	}
}

module.exports = authMiddleware;
