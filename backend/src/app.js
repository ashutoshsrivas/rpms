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

app.use(
	cors({
		origin: process.env.FRONTEND_ORIGIN || 'https://localhost:3000',
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
