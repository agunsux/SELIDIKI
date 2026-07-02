// routes/reputation.js

const express = require('express');
const router = express.Router();
const ReputationController = require('../controllers/reputationController');
const validationMiddleware = require('../middleware/validation');

// POST /api/v1/reputation/check
router.post('/reputation/check', validationMiddleware, ReputationController.check);

// GET /api/v1/reputation/health
router.get('/reputation/health', ReputationController.health);

module.exports = router;
