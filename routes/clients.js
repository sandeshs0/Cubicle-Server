const express = require('express');
const router = express.Router();
const { createClient, getClients, getClient, updateClient, deleteClient } = require('../controllers/clientController');
const upload = require('../middleware/upload');

// @route   POST /api/clients
// @desc    Create a new client
// @access  Private
router.post('/createClient', upload.uploadFile, createClient);

// @route   GET /api/clients
// @desc    Get all clients
// @access  Private
router.get('/getClients', getClients);

// @route   GET /api/clients/:id
// @desc    Get single client
// @access  Private
router.get('/:id', getClient);

// @route   PUT /api/clients/:id
// @desc    Update client
// @access  Private
router.put('/:id', upload.uploadFile, updateClient);

// @route   DELETE /api/clients/:id
// @desc    Delete client
// @access  Private
router.delete('/:id', deleteClient);

module.exports = router;
