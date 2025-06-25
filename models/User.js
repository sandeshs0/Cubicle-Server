const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: function() { return !this.googleId; }, // Required only if not signing up with Google
        minlength: 6,
    },
    role: {
        type: String,
        // enum: ['designer', 'developer', 'writer', 'project manager', 'freelancer', 'unassigned'],
        default: 'unassigned',
    },
    googleId: {
        type: String,
    },
    profileImage: {
        type: String, // URL to the profile image
        default: null,
    },
    plan: {
        type: String,
        enum: ['free', 'pro', 'vantage'],
        default: 'free',
    },
    otp: {
        type: String,
    },
    otpExpires: {
        type: Date,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Create a virtual for full name that combines first and last name
UserSchema.virtual('fullName').get(function() {
    return this.name;
});

// Make virtuals available when converting to JSON
UserSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);
