'use strict';

require('dotenv').config();

const app = require('./src/app');
const { ensureTables } = require('./src/config/db');

const port = Number(process.env.PORT || 4000);

ensureTables()
	.then(() => {
		app.listen(port, () => {
			console.log(`API running on http://localhost:${port}`);
		});
	})
	.catch((err) => {
		console.error('Startup failed:', err.message);
		process.exit(1);
	});
