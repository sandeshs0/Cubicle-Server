const Column = require('../models/Column');
const Board = require('../models/Board');
const { validationResult } = require('express-validator');

// @desc    Get all columns for a board
// @route   GET /api/boards/:boardId/columns
// @access  Private
exports.getColumns = async (req, res) => {
  try {
    // Verify user has access to the board
    const hasAccess = await Board.exists({
      _id: req.params.boardId,
      'members.userId': req.user.id
    });

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to access this board' 
      });
    }

    const columns = await Column.find({ boardId: req.params.boardId })
      .sort('order')
      .lean();

    res.json({ success: true, data: columns });
  } catch (error) {
    console.error('Error fetching columns:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a new column
// @route   POST /api/columns
// @access  Private
exports.createColumn = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, boardId } = req.body;

    // Verify user has admin/owner access to the board
    const board = await Board.findOne({
      _id: boardId,
      'members.userId': req.user.id,
      'members.role': { $in: ['owner', 'admin'] }
    });

    if (!board) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to create columns in this board' 
      });
    }

    // Get the highest order number
    const lastColumn = await Column.findOne({ boardId })
      .sort('-order')
      .select('order')
      .lean();

    const newColumn = new Column({
      title,
      boardId,
      order: lastColumn ? lastColumn.order + 1 : 0
    });

    const column = await newColumn.save();
    res.status(201).json({ success: true, data: column });
  } catch (error) {
    console.error('Error creating column:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a column
// @route   PUT /api/columns/:id
// @access  Private
exports.updateColumn = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, order } = req.body;

    // Find column and verify access
    const column = await Column.findById(req.params.id);
    if (!column) {
      return res.status(404).json({ 
        success: false, 
        message: 'Column not found' 
      });
    }

    const board = await Board.findOne({
      _id: column.boardId,
      'members.userId': req.user.id,
      'members.role': { $in: ['owner', 'admin'] }
    });

    if (!board) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this column' 
      });
    }

    // Update fields if provided
    if (title) column.title = title;
    if (order !== undefined) column.order = order;

    const updatedColumn = await column.save();
    res.json({ success: true, data: updatedColumn });
  } catch (error) {
    console.error('Error updating column:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a column
// @route   DELETE /api/columns/:id
// @access  Private
exports.deleteColumn = async (req, res) => {
  try {
    // Find column and verify access
    const column = await Column.findById(req.params.id);
    if (!column) {
      return res.status(404).json({ 
        success: false, 
        message: 'Column not found' 
      });
    }

    const board = await Board.findOne({
      _id: column.boardId,
      'members.userId': req.user.id,
      'members.role': { $in: ['owner', 'admin'] }
    });

    if (!board) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this column' 
      });
    }

    // Delete all tasks in this column
    await Task.deleteMany({ columnId: column._id });

    // Delete the column
    await column.remove();

    res.json({ success: true, message: 'Column deleted successfully' });
  } catch (error) {
    console.error('Error deleting column:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reorder columns
// @route   PUT /api/columns/:id/reorder
// @access  Private
exports.reorderColumns = async (req, res) => {
  try {
    const { newOrder } = req.body;

    // Find column and verify access
    const column = await Column.findById(req.params.id);
    if (!column) {
      return res.status(404).json({ 
        success: false, 
        message: 'Column not found' 
      });
    }

    const board = await Board.findOne({
      _id: column.boardId,
      'members.userId': req.user.id,
      'members.role': { $in: ['owner', 'admin'] }
    });

    if (!board) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to reorder columns' 
      });
    }

    // Update the order of the current column
    column.order = newOrder;
    await column.save();

    // Get all columns for the board
    const columns = await Column.find({ boardId: column.boardId }).sort('order');

    // Reorder other columns if needed
    for (let i = 0; i < columns.length; i++) {
      if (columns[i]._id.toString() !== column._id.toString()) {
        columns[i].order = i >= newOrder ? i + 1 : i;
        await columns[i].save();
      }
    }

    res.json({ success: true, message: 'Columns reordered successfully' });
  } catch (error) {
    console.error('Error reordering columns:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};