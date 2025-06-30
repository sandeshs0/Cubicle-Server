const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const boardController = require('../controllers/boardController');

// @route   GET /api/boards
// @desc    Get all boards for current user
// @access  Private
router.get('/', auth, boardController.getUserBoards);

// @route   POST /api/boards
// @desc    Create a new board
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('description', 'Description must be a string').optional().isString()
    ]
  ],
  boardController.createBoard
);

// @route   GET /api/boards/:id
// @desc    Get board by ID
// @access  Private
router.get('/:id', auth, boardController.getBoard);

// @route   PUT /api/boards/:id
// @desc    Update board
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('title', 'Title is required').optional().not().isEmpty(),
      check('description', 'Description must be a string').optional().isString()
    ]
  ],
  boardController.updateBoard
);

// @route   DELETE /api/boards/:id
// @desc    Delete board
// @access  Private
router.delete('/:id', auth, boardController.deleteBoard);

module.exports = router;