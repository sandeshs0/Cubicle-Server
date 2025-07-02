const mongoose = require('mongoose');


const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });


const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  description: String,
  coverImage: String,
  dueDate: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  columnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Column',
    required: true
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  labels: [{
    id: String,
    color: String,
    text: String
  }],
  subtasks: [subtaskSchema],
  position: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

// Indexes for better query performance
taskSchema.index({ columnId: 1, position: 1 });
taskSchema.index({ boardId: 1 });
taskSchema.index({ title: 'text', description: 'text' });


taskSchema.virtual('completion').get(function() {
  if (!this.subtasks || this.subtasks.length === 0) return 0;
  const completed = this.subtasks.filter(st => st.isCompleted).length;
  return Math.round((completed / this.subtasks.length) * 100);
});

module.exports = mongoose.model('Task', taskSchema);