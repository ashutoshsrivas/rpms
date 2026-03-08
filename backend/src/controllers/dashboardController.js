'use strict';

async function baseDashboard(req, res) {
	res.json({
		message: `Welcome ${req.user.email}`,
		role: req.user.role,
	});
}

async function adminDashboard(_req, res) {
	res.json({ message: 'Admin dashboard data', role: 'ADMIN' });
}

async function hodDashboard(_req, res) {
	res.json({ message: 'HOD dashboard data', role: 'HOD' });
}

async function userDashboard(_req, res) {
	res.json({ message: 'User dashboard data', role: 'USER' });
}

module.exports = { baseDashboard, adminDashboard, hodDashboard, userDashboard };
