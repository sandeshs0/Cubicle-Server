const express = require('express');
const router = express.Router();
const { getProfile } = require('../controllers/profileController');
const auth = require('../middleware/auth');

// @route   GET /api/profile
// @desc    Get current user's profile
// @access  Private
router.get('/', auth, getProfile);

module.exports = router;
