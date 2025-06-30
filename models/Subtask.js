const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Subtask title is required'],
    trim: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  position: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
subtaskSchema.index({ taskId: 1, position: 1 });

module.exports = mongoose.model('Subtask', subtaskSchema);