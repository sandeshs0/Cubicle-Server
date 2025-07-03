const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const taskController = require('../controllers/taskController');
const { uploadTaskCover } = require('../middleware/upload');

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post(
  '/',
  [
    auth,
    uploadTaskCover,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('columnId', 'Column ID is required').isMongoId(),
      check('boardId', 'Board ID is required').isMongoId(),
      check('priority', 'Priority must be low, medium, high or critical')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical']),
      check('assignedTo', 'Assigned users must be an array of user IDs')
        .optional()
        .isArray(),
      check('labels', 'Labels must be an array').optional().isArray()
    ]
  ],
  taskController.createTask
);

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', auth, taskController.getTask);

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put(
  '/:id',
  [
    auth,
    uploadTaskCover,
    [
      check('title', 'Title is required').optional().not().isEmpty(),
      check('columnId', 'Column ID must be a valid MongoDB ID')
        .optional()
        .isMongoId(),
      check('priority', 'Priority must be low, medium, high or critical')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical']),
      check('assignedTo', 'Assigned users must be an array of user IDs')
        .optional()
        .isArray(),
      check('labels', 'Labels must be an array').optional().isArray()
    ]
  ],
  taskController.updateTask
);

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', auth, taskController.deleteTask);

// @route   PUT /api/tasks/:id/move
// @desc    Move a task to a different column
// @access  Private
router.put(
  '/:id/move',
  [
    auth,
    [
      check('columnId', 'Column ID is required').isMongoId(),
      check('position', 'Position must be a number').isNumeric()
    ]
  ],
  taskController.moveTask
);

// @route   PUT /api/tasks/:taskId/subtasks/:subtaskId/toggle
// @desc    Toggle subtask completion status
// @access  Private
router.put(
  '/:taskId/subtasks/:subtaskId/toggle',
  auth,
  taskController.toggleSubtask
);



module.exports = router;