// routes/ai.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

// @route   POST /api/ai/rewrite-email
// @desc    Rewrite email content using AI
// @access  Private
router.post('/rewrite-email', auth, aiController.rewriteEmail);

module.exports = router;