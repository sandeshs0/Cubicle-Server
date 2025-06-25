const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    status: {
        type: String,
        enum: ['not started', 'in progress', 'completed'],
        default: 'not started'
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    coverImage: {
        type: String,
        default: null
    },
    coverImageId: {
        type: String,
        default: null
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    completionRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    expectedRevenue: {
        type: Number,
        default: 0
    },
    remarks: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        default: 'Web Development'
    }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
