const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const columnController = require('../controllers/columnController');

// @route   GET /api/boards/:boardId/columns
// @desc    Get all columns for a board
// @access  Private
router.get('/boards/:boardId/columns', auth, columnController.getColumns);

// @route   POST /api/columns
// @desc    Create a new column
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('boardId', 'Board ID is required').isMongoId()
    ]
  ],
  columnController.createColumn
);

// @route   PUT /api/columns/:id
// @desc    Update a column
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('title', 'Title is required').optional().not().isEmpty(),
      check('order', 'Order must be a number').optional().isNumeric()
    ]
  ],
  columnController.updateColumn
);

// @route   DELETE /api/columns/:id
// @desc    Delete a column
// @access  Private
router.delete('/:id', auth, columnController.deleteColumn);

// @route   PUT /api/columns/:id/reorder
// @desc    Reorder columns
// @access  Private
router.put(
  '/:id/reorder',
  [
    auth,
    [
      check('newOrder', 'New order is required').isNumeric()
    ]
  ],
  columnController.reorderColumns
);

module.exports = router;