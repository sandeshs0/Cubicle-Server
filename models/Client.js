const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    profileImage: {
        type: String, // URL to profile image
        default: null
    },
    profileImageId: {
        type: String, // Cloudinary public ID
        default: null
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    contactNumber: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true,
        default: null
    },
    organisation: {
        type: String,
        trim: true,
        default: null
    },
    remarks: {
        type: String,
        trim: true,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update updatedAt field before saving
clientSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Client', clientSchema);
