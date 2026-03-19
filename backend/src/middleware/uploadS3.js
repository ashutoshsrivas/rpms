'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Region = process.env.AWS_REGION;
const s3Bucket = process.env.S3_BUCKET;
const s3AccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const s3Acl = process.env.S3_ACL || 'private';
const rawPrefix = process.env.S3_PREFIX || 'uploads';
const s3Prefix = `${rawPrefix.replace(/^\/+|\/+$/g, '')}/`;
const s3PublicBase = process.env.S3_PUBLIC_BASE; // optional CDN/alias

const allowedMime = [
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'video/mp4',
	'image/png',
	'image/jpeg',
	'text/plain',
];

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (allowedMime.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error('Invalid file type'));
		}
	},
});

function buildS3Client() {
	if (!s3Region || !s3Bucket || !s3AccessKeyId || !s3SecretAccessKey) {
		const missing = [];
		if (!s3Region) missing.push('AWS_REGION');
		if (!s3Bucket) missing.push('S3_BUCKET');
		if (!s3AccessKeyId) missing.push('AWS_ACCESS_KEY_ID');
		if (!s3SecretAccessKey) missing.push('AWS_SECRET_ACCESS_KEY');
		throw new Error(`S3 configuration missing: ${missing.join(', ')}`);
	}

	return new S3Client({
		region: s3Region,
		credentials: {
			accessKeyId: s3AccessKeyId,
			secretAccessKey: s3SecretAccessKey,
		},
	});
}

function buildS3Key(file) {
	const timestamp = Date.now();
	const ext = path.extname(file.originalname).toLowerCase();
	const base =
		path
			.parse(file.originalname)
			.name.replace(/[^a-z0-9_-]+/gi, '-')
			.replace(/^-+|-+$/g, '') || 'file';
	const random = crypto.randomBytes(6).toString('hex');
	return `${s3Prefix}${timestamp}-${random}-${base}${ext}`;
}

async function uploadToS3(file) {
	const s3 = buildS3Client();
	const Key = buildS3Key(file);

	await s3.send(
		new PutObjectCommand({
			Bucket: s3Bucket,
			Key,
			Body: file.buffer,
			ContentType: file.mimetype,
			ACL: s3Acl,
		})
	);

	const defaultBase = `https://s3.${s3Region}.amazonaws.com/${s3Bucket}`;
	const publicBase = (s3PublicBase || defaultBase).replace(/\/+$/g, '');
	return { key: Key, url: `${publicBase}/${Key}` };
}

async function s3UploadMiddleware(req, res, next) {
	if (!req.file) {
		next();
		return;
	}

	try {
		const { url, key } = await uploadToS3(req.file);
		req.uploadedFile = {
			url,
			key,
			mimetype: req.file.mimetype,
			size: req.file.size,
			originalName: req.file.originalname,
		};
		next();
	} catch (err) {
		console.error('Failed to upload to S3:', {
			message: err.message,
			code: err.code,
			statusCode: err.$metadata?.httpStatusCode,
		});
		res.status(500).json({ 
			message: 'Failed to upload file',
			details: process.env.NODE_ENV === 'development' ? err.message : undefined
		});
	}
}

module.exports = {
	upload,
	s3UploadMiddleware,
};
