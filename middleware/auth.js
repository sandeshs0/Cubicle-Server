const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('x-auth-token');
        
        if (!token) {
            console.log('No token in header');
            return res.status(401).json({ msg: 'No token, authorization denied' });
        }

        try {
            console.log('Verifying token...', token.substring(0, 20) + '...'); // Log first 20 chars of token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token verified successfully');
            
            // Check if user exists
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                console.log('User not found');
                return res.status(401).json({ msg: 'User not found, authorization denied' });
            }
            
            // Store user in request
            req.user = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            };
            next();
        } catch (err) {
            console.error('Token verification failed:', err.message);
            res.status(401).json({ msg: 'Token is not valid' });
        }
    } catch (err) {
        console.error('Auth middleware error:', err.message);
        res.status(500).send('Server error');
    }
};