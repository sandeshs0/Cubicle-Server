const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const taskController = require('../controllers/taskController');

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('columnId', 'Column ID is required').isMongoId(),
      check('boardId', 'Board ID is required').isMongoId(),
      check('priority', 'Priority must be low, medium, or high')
        .optional()
        .isIn(['low', 'medium', 'high']),
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
    [
      check('title', 'Title is required').optional().not().isEmpty(),
      check('columnId', 'Column ID must be a valid MongoDB ID')
        .optional()
        .isMongoId(),
      check('priority', 'Priority must be low, medium, or high')
        .optional()
        .isIn(['low', 'medium', 'high']),
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

module.exports = router;