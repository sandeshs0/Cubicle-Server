const express = require('express');
const router = express.Router();
const emailStatsController = require('../controllers/emailStatsController');
const { check, body } = require('express-validator');
const emailController = require('../controllers/emailController');
const auth = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');

// @route   POST /api/emails
// @desc    Send an email
// @access  Private
router.post(
    '/',
    [
        auth,
        // Handle file uploads
        uploadMultiple.array('attachments', 5), // Max 5 files
        (req, res, next) => {
            // If there was a file upload error, handle it
            if (req.fileValidationError) {
                return res.status(400).json({
                    success: false,
                    message: req.fileValidationError
                });
            }
            next();
        },
        [
            // Validate request body
            body('to', 'At least one recipient is required')
                .custom((value) => {
                    try {
                        // Handle both string and array inputs
                        const recipients = typeof value === 'string' ? JSON.parse(value) : value;
                        const recipientList = Array.isArray(recipients) ? recipients : [recipients];
                        
                        if (!recipientList.length) return false;
                        
                        return recipientList.every(recipient => {
                            if (!recipient) return false;
                            const email = typeof recipient === 'string' ? recipient : recipient.email;
                            return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                        });
                    } catch (e) {
                        // If it's not a JSON string, check if it's a simple email
                        if (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                            return true;
                        }
                        return false;
                    }
                })
                .withMessage('Invalid recipient format. Must be an email string, array of emails, or array of objects with email property'),
            body('subject', 'Subject is required')
                .trim()
                .notEmpty()
                .isLength({ max: 200 })
                .withMessage('Subject must be less than 200 characters'),
            body('body', 'Email body is required')
                .trim()
                .notEmpty()
                .isLength({ max: 10000 })
                .withMessage('Email body must be less than 10000 characters'),
            body('projectId', 'Invalid project ID')
                .optional()
                .isMongoId(),
            body('clientId', 'Invalid client ID')
                .optional()
                .isMongoId()
        ]
    ],
    emailController.sendEmail
);

// @route   GET /api/emails
// @desc    Get all sent emails for the authenticated user
// @access  Private
router.get(
    '/',
    [
        auth,
        [
            // Optional query parameters for filtering
            check('projectId', 'Invalid project ID').optional().isMongoId(),
            check('clientId', 'Invalid client ID').optional().isMongoId(),
            check('limit', 'Limit must be a number').optional().isInt({ min: 1, max: 100 }),
            check('page', 'Page must be a number').optional().isInt({ min: 1 })
        ]
    ],
    emailController.getUserEmails  // Fixed: Changed from getSentEmails to getUserEmails
);

// Email statistics
router.get('/stats', require('../middleware/auth'), emailStatsController.getEmailStats);

// @route   GET /api/emails/:id
// @desc    Get email by ID
// @access  Private
router.get(
    '/:id',
    [
        auth,
        check('id', 'Invalid email ID').isMongoId()
    ],
    emailController.getEmailById
);

module.exports = router;
