const Task = require('../models/Task');
const Board = require('../models/Board');
const Column = require('../models/Column');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { deleteFile } = require('../middleware/upload');


const parseJsonField = (field) => {
  try {
    return field ? JSON.parse(field) : undefined;
  } catch (error) {
    return undefined;
  }
};


// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  const errors = validationResult(req);
  console.log(req.body);
  console.log(errors);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {

    const parseField = (field) => {
      if (!field) return undefined;
      try {
        return typeof field === 'string' ? JSON.parse(field) : field;
      } catch (e) {
        console.error('Error parsing field:', field, e);
        return undefined;
      }
    };

    const { 
      title, 
      description, 
      columnId, 
      boardId, 
      dueDate, 
      priority, 
      // assignedTo = [],
      // labels = [] ,
      // subtasks = [],
      // coverImage=null,
      
    } = req.body;


    // Parsing JSON fields
    const assignedTo = parseField(req.body.assignedTo) || [];
    const labels = parseField(req.body.labels) || [];
    const subtasks = parseField(req.body.subtasks) || [];
    

    // Verify user has access to the board
    const board = await Board.findOne({
      _id: boardId,
      'members.userId': req.user.id
    });

    if (!board) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to create tasks in this board' 
      });
    }

    // Verify column exists in the same board
    const column = await Column.findOne({
      _id: columnId,
      boardId
    });

    if (!column) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid column' 
      });
    }

    // Get the highest position in the column
    const lastTask = await Task.findOne({ columnId })
      .sort('-position')
      .select('position')
      .lean();

    const newTask = new Task({
      title,
      description,
      columnId,
      boardId,
      createdBy: req.user.id,
      assignedTo,
      dueDate,
      priority,
      labels,
      subtasks: subtasks.map(st=>({
        title: st.title,
        isCompleted: st.isCompleted || false
      })),
      coverImage:req.file ? req.file.path : null,
      position: lastTask ? lastTask.position + 1 : 0
    });

    const task = await newTask.save();

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    res.status(201).json({ success: true, data: populatedTask });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    // Verify user has access to the board
    const hasAccess = await Board.exists({
      _id: task.boardId,
      'members.userId': req.user.id
    });

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this task' 
      });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
// exports.updateTask = async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }

//   try {
//     const task = await Task.findById(req.params.id);
//     if (!task) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Task not found' 
//       });
//     }

//     // Verify user has access to the board
//     const board = await Board.findOne({
//       _id: task.boardId,
//       'members.userId': req.user.id
//     });

//     if (!board) {
//       return res.status(403).json({ 
//         success: false, 
//         message: 'Not authorized to update this task' 
//       });
//     }

//     // Update fields
//     const updates = {};
//     const allowedUpdates = [
//       'title', 'description', 'columnId', 'dueDate', 'priority', 
//       'assignedTo', 'labels', 'coverImage'
//     ];

//     allowedUpdates.forEach(field => {
//       if (req.body[field] !== undefined) {
//         updates[field] = req.body[field];
//       }
//     });

//     // If changing columns, update the position to the end of the new column
//     if (updates.columnId) {
//       const lastTask = await Task.findOne({ columnId: updates.columnId })
//         .sort('-position')
//         .select('position')
//         .lean();

//       updates.position = lastTask ? lastTask.position + 1 : 0;
//     }

//     const updatedTask = await Task.findByIdAndUpdate(
//       req.params.id,
//       { $set: updates },
//       { new: true }
//     )
//       .populate('createdBy', 'name email')
//       .populate('assignedTo', 'name email');

//     res.json({ success: true, data: updatedTask });
//   } catch (error) {
//     console.error('Error updating task:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

exports.updateTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    // Verify user has access to the board
    const board = await Board.findOne({
      _id: task.boardId,
      'members.userId': req.user.id
    });

    if (!board) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this task' 
      });
    }

    // Update fields
    const {
      title,
      description,
      columnId,
      dueDate,
      priority,
      assignedTo,
      labels,
      subtasks,
      // coverImage
    } = req.body;

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (priority) task.priority = priority;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (labels !== undefined) task.labels = labels;
    if (subtasks !== undefined) {
      task.subtasks = subtasks.map(st => ({
        _id: st._id || new mongoose.Types.ObjectId(),
        title: st.title,
        isCompleted: st.isCompleted || false
      }));
    }
    // if (req.file) {
    //   // Delete old cover image if it exists
    //   if (task.coverImage) {
    //     await deleteFile(task.coverImage);
    //   }
    //   task.coverImage = req.file.path;
    // }


    // If changing columns, update position to the end of the new column
    if (columnId && columnId !== task.columnId.toString()) {
      const newColumn = await Column.findOne({
        _id: columnId,
        boardId: task.boardId
      });

      if (!newColumn) {
        if (req.file) await deleteFile(req.file.path);
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid column' 
        });
      }

      const lastTask = await Task.findOne({ columnId })
        .sort('-position')
        .select('position')
        .lean();

      task.columnId = columnId;
      task.position = lastTask ? lastTask.position + 1 : 0;
    }

    const updatedTask = await task.save();
    const populatedTask = await Task.findById(updatedTask._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    res.json({ 
      success: true, 
      data: populatedTask 
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};


// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    // Verify user has access to the board
    const board = await Board.findOne({
      _id: task.boardId,
      'members.userId': req.user.id
    });

    if (!board) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this task' 
      });
    }

    await task.remove();
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// @desc    Toggle subtask completion status
// @route   PUT /api/tasks/:taskId/subtasks/:subtaskId/toggle
// @access  Private
exports.toggleSubtask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      'subtasks._id': req.params.subtaskId
    });

    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task or subtask not found' 
      });
    }

    // Verify user has access to the board
    const board = await Board.findOne({
      _id: task.boardId,
      'members.userId': req.user.id
    });

    if (!board) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this task' 
      });
    }

    // Toggle the subtask's completion status
    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subtask not found' 
      });
    }

    subtask.isCompleted = !subtask.isCompleted;
    await task.save();

    // Get the updated task with populated fields
    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    res.json({ 
      success: true, 
      data: {
        task: updatedTask,
        completion: updatedTask.completion
      } 
    });
  } catch (error) {
    console.error('Error toggling subtask:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};


// @desc    Move a task to a different column
// @route   PUT /api/tasks/:id/move
// @access  Private
exports.moveTask = async (req, res) => {
    try {
      const { columnId, position } = req.body;
      const taskId = req.params.id;
  
      // Find the task
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found'
        });
      }
  
      // Verify user has access to the board
      const board = await Board.findOne({
        _id: task.boardId,
        'members.userId': req.user.id
      });
  
      if (!board) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to move this task' 
        });
      }
  
      // If moving to a different column, verify it exists in the same board
      if (columnId && columnId !== task.columnId.toString()) {
        const newColumn = await Column.findOne({
          _id: columnId,
          boardId: task.boardId
        });
  
        if (!newColumn) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid column' 
          });
        }
      }
  
      // Get all tasks in the target column
      const targetColumnId = columnId || task.columnId;
      const tasksInColumn = await Task.find({ 
        columnId: targetColumnId,
        _id: { $ne: task._id }
      }).sort('position');
  
      // Calculate new position
      const newPosition = position !== undefined ? 
        Math.min(position, tasksInColumn.length) : 
        tasksInColumn.length;
  
      // Update positions of other tasks in the column
      const bulkOps = tasksInColumn
        .map((t, index) => {
          const pos = index >= newPosition ? index + 1 : index;
          if (t.position !== pos) {
            return {
              updateOne: {
                filter: { _id: t._id },
                update: { $set: { position: pos } }
              }
            };
          }
          return null;
        })
        .filter(op => op !== null);
  
      if (bulkOps.length > 0) {
        await Task.bulkWrite(bulkOps);
      }
  
      // Update the task's column and position
      task.columnId = targetColumnId;
      task.position = newPosition;
      await task.save();
  
      // Populate the task with user data
      const populatedTask = await Task.findById(task._id)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email');
  
      res.json({ 
        success: true, 
        message: 'Task moved successfully',
        data: populatedTask
      });
    } catch (error) {
      console.error('Error moving task:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: error.message 
      });
    }
  };