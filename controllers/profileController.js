const User = require('../models/User');

// @desc    Get current user's profile
// @route   GET /api/profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        res.json({
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            profileImage: user.profileImage,
            plan: user.plan,
            role: user.role,
            isVerified: user.isVerified
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
