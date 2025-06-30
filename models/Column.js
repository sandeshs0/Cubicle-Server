const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Column title is required'],
    trim: true
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure each column has a unique order within its board
columnSchema.index({ boardId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Column', columnSchema);