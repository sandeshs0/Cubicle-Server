const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

// @route   GET /api/users/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, userController.getProfile);

// @route   PUT /api/users/me
// @desc    Update user profile
// @access  Private
router.put(
    '/me',
    [
        auth,
        check('name', 'Name is required').optional().not().isEmpty(),
        check('email', 'Please include a valid email').optional().isEmail(),
        check('role', 'Invalid role').optional().isIn([
            'designer', 
            'developer', 
            'writer', 
            'project manager', 
            'freelancer', 
            'unassigned'
        ])
    ],
    userController.updateProfile
);

// @route   PUT /api/users/me/avatar
// @desc    Update profile picture
// @access  Private
router.put(
    '/me/avatar',
    auth,
    userController.updateProfilePicture 
);

// @route   PUT /api/users/change-password
// @desc    Change password
// @access  Private
router.put(
    '/change-password',
    [
        auth,
        check('currentPassword', 'Current password is required').exists(),
        check('newPassword', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
    ],
    userController.changePassword
);

module.exports = router;
