'use strict';

function requireRole(roles) {
	return function roleGuard(req, res, next) {
		if (!req.user || !roles.includes(req.user.role)) {
			res.status(403).json({ message: 'Forbidden' });
			return;
		}
		next();
	};
}

module.exports = requireRole;
