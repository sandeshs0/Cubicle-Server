const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Board title is required'],
    trim: true
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  background: String,
  settings: {
    defaultRole: {
      type: String,
      enum: ['member', 'viewer'],
      default: 'member'
    },
    allowMemberInvites: {
      type: Boolean,
      default: true
    }
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Add the creator as the owner when creating a new board
boardSchema.pre('save', function(next) {
  if (this.isNew) {
    this.members.push({
      userId: this.createdBy,
      role: 'owner'
    });
  }
  next();
});

module.exports = mongoose.model('Board', boardSchema);