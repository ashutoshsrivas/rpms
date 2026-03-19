'use strict';

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const healthRoutes = require('./routes/healthRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const researchSeedRoutes = require('./routes/researchSeedRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Configure CORS to accept requests from frontend
const allowedOrigins = [
	'http://localhost:3000',
	'https://localhost:3000',
	'https://rpms.geu.ac.in',
	process.env.FRONTEND_ORIGIN
].filter(Boolean);

app.use(
	cors({
		origin: function (origin, callback) {
			// Allow requests with no origin (like mobile apps or curl requests)
			if (!origin) return callback(null, true);
			
			if (allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email'],
	})
);
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/seed-research', researchSeedRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', chatRoutes);
app.use('/api/reports', reportRoutes);

module.exports = app;
