'use strict';

const express = require('express');
const { listItems, createItem } = require('../controllers/itemController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', listItems);
router.post('/', authMiddleware, createItem);

module.exports = router;
