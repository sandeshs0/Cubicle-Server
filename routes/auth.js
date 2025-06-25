const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { check } = require('express-validator');
const userController = require('../controllers/userController');

// Utility to generate a JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};
const { register, verifyEmail, login, updateRole } = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', register);

// @route   POST api/auth/verify
// @desc    Verify email and get token
// @access  Public
router.post('/verify', verifyEmail);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   PUT api/auth/role
// @desc    Update user role
// @access  Private
router.put('/role', auth, updateRole);

// @route   GET api/auth/google
// @desc    Authenticate with Google
// @access  Public
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @route   GET api/auth/google/callback
// @desc    Google auth callback
// @access  Public
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/', session: false }),
    (req, res) => {
        const token = generateToken(req.user._id);
        const isNewUser = req.user.isNewUser;
        // Redirect to the frontend with the token and isNewUser flag
        res.redirect(`${process.env.FRONTEND_URL}/OAuthCallback?token=${token}&isNewUser=${isNewUser}`);
    }
);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password - Generate reset token
// @access  Public
router.post(
    '/forgot-password',
    [
        check('email', 'Please include a valid email').isEmail()
    ],
    userController.forgotPassword
);

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.put(
    '/reset-password/:token',
    [
        check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
    ],
    userController.resetPassword
);

module.exports = router;
