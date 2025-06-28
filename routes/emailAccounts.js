// routes/emailAccounts.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const emailAccountController = require('../controllers/emailAccountController');

// @route   POST /api/email-accounts
// @desc    Add new email account
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('email', 'Please include a valid email').isEmail(),
      check('displayName', 'Display name is required').not().isEmpty(),
      check('smtp.host', 'SMTP host is required').not().isEmpty(),
      check('smtp.port', 'SMTP port is required').isInt({ min: 1, max: 65535 }),
      check('smtp.secure', 'SMTP secure must be a boolean').optional().isBoolean(),
      check('auth.user', 'Email username is required').not().isEmpty(),
      check('auth.pass', 'Email password is required').exists()
    ]
  ],
  emailAccountController.addEmailAccount
);

// @route   GET /api/email-accounts/verify/:token
// @desc    Verify email account
// @access  Public
router.get(
  '/verify/:token',
  emailAccountController.verifyEmailAccount
);

// @route   GET /api/email-accounts
// @desc    Get user's email accounts
// @access  Private
router.get(
  '/',
  auth,
  emailAccountController.getEmailAccounts
);

// @route   PUT /api/email-accounts/:id/set-default
// @desc    Set default email account
// @access  Private
router.put(
  '/:id/set-default',
  auth,
  emailAccountController.setDefaultEmailAccount
);

router.delete('/:id', auth, emailAccountController.deleteEmailAccount);

router.get('/check', auth, emailAccountController.checkEmailAccount);

module.exports = router;