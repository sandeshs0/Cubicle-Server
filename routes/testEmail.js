const express = require('express');
const router = express.Router();
const { testSMTPConnection, sendTestEmail } = require('../controllers/testEmailController');
const auth = require('../middleware/auth');

// @route   GET /api/email/test/connection
// @desc    Test SMTP connection
// @access  Private
router.get('/test/connection', auth, testSMTPConnection);

// @route   POST /api/email/test/send
// @desc    Send a test email
// @access  Private
router.post('/test/send', auth, sendTestEmail);

module.exports = router;
