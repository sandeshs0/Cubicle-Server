const express = require('express');
const router = express.Router();
const { createProject, getProjects, getProject, updateProject, deleteProject, updateProjectCover } = require('../controllers/projectController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post('/', auth, createProject);

// @route   GET /api/projects
// @desc    Get all projects
// @access  Private
router.get('/', auth, getProjects);

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', auth, getProject);

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
router.put('/:id', auth, updateProject);

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
router.delete('/:id', auth, deleteProject);

// @route   PUT /api/projects/:id/cover
// @desc    Update project cover image
// @access  Private
router.put('/:id/cover', auth, upload.uploadCoverImage, updateProjectCover);

module.exports = router;
