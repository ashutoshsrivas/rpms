'use strict';

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
	host: process.env.DB_HOST || 'localhost',
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_NAME || 'rpms',
	port: Number(process.env.DB_PORT || 3306),
	waitForConnections: true,
	connectionLimit: 10,
	namedPlaceholders: true,
});

async function ensureTables() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL DEFAULT '',
			phone VARCHAR(32) NOT NULL DEFAULT '',
			email VARCHAR(255) NOT NULL UNIQUE,
			password_hash VARCHAR(255) NOT NULL,
			role ENUM('ADMIN','HOD','USER') NOT NULL DEFAULT 'USER',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB;
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS uploads (
			id INT AUTO_INCREMENT PRIMARY KEY,
			original_name VARCHAR(255) NOT NULL,
			s3_key VARCHAR(500) NOT NULL,
			url VARCHAR(500) NOT NULL,
			mimetype VARCHAR(100) NOT NULL,
			size BIGINT NOT NULL,
			uploader_email VARCHAR(255) NOT NULL DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB;
	`);

	// Migrate legacy table name to unified requests table
	const [requestsTable] = await pool.query("SHOW TABLES LIKE 'requests'");
	if (!requestsTable.length) {
		const [legacySeed] = await pool.query("SHOW TABLES LIKE 'research_seed_projects'");
		if (legacySeed.length) {
			await pool.query('ALTER TABLE research_seed_projects RENAME TO requests');
		}
	}

	await pool.query(`
		CREATE TABLE IF NOT EXISTS requests (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_email VARCHAR(255) NOT NULL,
			request_type VARCHAR(100) NOT NULL DEFAULT 'seed-research',
			data LONGTEXT NOT NULL,
			upload_key VARCHAR(500) DEFAULT NULL,
			upload_url VARCHAR(500) DEFAULT NULL,
			approval_authority VARCHAR(255) NOT NULL DEFAULT '',
			status ENUM('draft','submitted','in-review','approved','rejected') NOT NULL DEFAULT 'draft',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		) ENGINE=InnoDB;
	`);

	// Ensure columns exist on older tables
	try {
		await pool.query(
			"ALTER TABLE users ADD COLUMN role ENUM('ADMIN','HOD','USER') NOT NULL DEFAULT 'USER' AFTER password_hash"
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}

	try {
		await pool.query(
			"ALTER TABLE users ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '' AFTER id"
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}

	try {
		await pool.query(
			"ALTER TABLE users ADD COLUMN phone VARCHAR(32) NOT NULL DEFAULT '' AFTER name"
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}

	try {
		await pool.query(
			'ALTER TABLE uploads ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}

	try {
		await pool.query(
			"ALTER TABLE uploads ADD COLUMN uploader_email VARCHAR(255) NOT NULL DEFAULT '' AFTER size"
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}

	try {
		await pool.query(
			"ALTER TABLE requests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}

	try {
		await pool.query(
			"ALTER TABLE requests MODIFY status ENUM('draft','submitted','in-review','approved','rejected') NOT NULL DEFAULT 'draft'"
		);
	} catch (err) {
		if (err.code !== 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' && err.code !== 'ER_BAD_FIELD_ERROR') {
			// ignore if already correct
		}
	}

	try {
		await pool.query(
			"ALTER TABLE requests ADD COLUMN approval_authority VARCHAR(255) NOT NULL DEFAULT '' AFTER upload_url"
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}

	try {
		await pool.query(
			"ALTER TABLE requests ADD COLUMN request_type VARCHAR(100) NOT NULL DEFAULT 'seed-research' AFTER user_email"
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}

	try {
		await pool.query("UPDATE requests SET request_type = 'seed-research' WHERE request_type IS NULL OR request_type = ''");
	} catch (err) {
		// ignore data backfill errors to avoid blocking startup
	}

	await pool.query(`
		CREATE TABLE IF NOT EXISTS items (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB;
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS chat_messages (
			id INT AUTO_INCREMENT PRIMARY KEY,
			request_id INT NOT NULL,
			sender_email VARCHAR(255) NOT NULL,
			content TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
		) ENGINE=InnoDB;
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS chat_files (
			id INT AUTO_INCREMENT PRIMARY KEY,
			request_id INT NOT NULL,
			chat_message_id INT DEFAULT NULL,
			sender_email VARCHAR(255) NOT NULL,
			file_key VARCHAR(500) NOT NULL,
			file_url VARCHAR(500) NOT NULL,
			is_private TINYINT(1) NOT NULL DEFAULT 0,
			is_admin_private TINYINT(1) NOT NULL DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
			FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL
		) ENGINE=InnoDB;
	`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS post_approval_requirements (
			id INT AUTO_INCREMENT PRIMARY KEY,
			request_id INT NOT NULL,
			label VARCHAR(255) NOT NULL,
			status ENUM('pending','submitted','fulfilled') NOT NULL DEFAULT 'pending',
			created_by VARCHAR(255) NOT NULL DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
		) ENGINE=InnoDB;
	`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS post_approval_submissions (
			id INT AUTO_INCREMENT PRIMARY KEY,
			requirement_id INT NOT NULL,
			request_id INT NOT NULL,
			uploader_email VARCHAR(255) NOT NULL,
			file_key VARCHAR(500) NOT NULL,
			file_url VARCHAR(500) NOT NULL,
			note VARCHAR(500) DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (requirement_id) REFERENCES post_approval_requirements(id) ON DELETE CASCADE,
			FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
		) ENGINE=InnoDB;
	`);

	try {
		await pool.query(
			"ALTER TABLE chat_files ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 0 AFTER file_url"
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}

	try {
		await pool.query(
			"ALTER TABLE chat_files ADD COLUMN is_admin_private TINYINT(1) NOT NULL DEFAULT 0 AFTER is_private"
		);
	} catch (err) {
		if (err.code !== 'ER_DUP_FIELDNAME') {
			throw err;
		}
	}
}

module.exports = { pool, ensureTables };
