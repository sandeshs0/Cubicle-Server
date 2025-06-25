const User = require('../models/User');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { uploadProfileImage } = require('../middleware/upload');

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -otp -otpExpires');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/me
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const profileFields = {};
        
        if (name) profileFields.name = name;
        if (email) profileFields.email = email.toLowerCase();
        if (role) profileFields.role = role;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: profileFields },
            { new: true, runValidators: true }
        ).select('-password -otp -otpExpires');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Error updating profile:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update profile picture
// @route   PUT /api/users/me/avatar
// @access  Private
exports.updateProfilePicture = [
    uploadProfileImage,
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Please upload a file' });
            }

            const user = await User.findByIdAndUpdate(
                req.user.id,
                { profileImage: req.file.path },
                { new: true }
            ).select('-password -otp -otpExpires');

            res.json({ success: true, data: user });
        } catch (error) {
            console.error('Error updating profile picture:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
];

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide current and new password' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        // Get user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if user has a password (OAuth users might not have one)
        if (!user.password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please use the password reset option instead' 
            });
        }

        // Verify current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Forgot password - Generate reset token
// @route   POST /api/auth/forgot-password
// @access  Public 
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user doesn't exist for security
            return res.json({ 
                success: true, 
                message: 'If an account with that email exists, a reset link has been sent' 
            });
        }

        // Generate reset token (using OTP field for simplicity)
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        user.otp = resetToken;
        user.otpExpires = resetExpires;
        await user.save();

        // TODO: Send email with reset link
        // await sendPasswordResetEmail(user.email, resetToken);

        res.json({ 
            success: true, 
            message: 'If an account with that email exists, a reset link has been sent',
            // In development, return the token for testing
            ...(process.env.NODE_ENV === 'development' && { token: resetToken })
        });
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Reset password with token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Validate input
        if (!password || password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Find user by token and check expiration
        const user = await User.findOne({
            otp: token,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // TODO: Send confirmation email
        // await sendPasswordChangedConfirmation(user.email);

        res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
