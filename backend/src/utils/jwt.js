'use strict';

const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
	return jwt.sign(
		{ sub: user.id, email: user.email, role: user.role || 'USER' },
		jwtSecret,
		{ expiresIn: '2h' }
	);
}

function verifyToken(token) {
	return jwt.verify(token, jwtSecret);
}

module.exports = { signToken, verifyToken };
