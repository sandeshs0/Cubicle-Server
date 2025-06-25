const Project = require('../models/Project');
const cloudinary = require('../config/cloudinary');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res) => {
    try {
        const { name, description, status, startDate, endDate, client, completionRate, expectedRevenue, remarks } = req.body;

        // Validate required fields
        if (!name || !client) {
            return res.status(400).json({ msg: 'Project name and client are required' });
        }

        const project = new Project({
            name,
            description,
            status,
            startDate,
            endDate,
            client,
            completionRate,
            expectedRevenue,
            remarks,
            user: req.user.id
        });

        await project.save();
        res.status(201).json(project);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all projects for current user
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find({ user: req.user.id });
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            user: req.user.id
        }).populate('client', 'name email contactNumber address organisation profileImage');

        if (!project) {
            return res.status(404).json({ msg: 'Project not found' });
        }

        // Format the response to match frontend expectations
        const response = {
            _id: project._id,
            name: project.name,
            description: project.description,
            category: project.category || 'Web Development',
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            coverImage: project.coverImage || null,
            completionRate: project.completionRate || 0,
            expectedRevenue: project.expectedRevenue || 0,
            remarks: project.remarks || '',
            client: {
                _id: project.client._id,
                name: project.client.name,
                email: project.client.email,
                location: project.client.address || 'Not specified',
                phone: project.client.contactNumber || 'Not specified',
                profileImage: project.client.profileImage || null
            },
            payment: {
                totalContract: project.expectedRevenue || 0,
                receivedAmount: Math.floor((project.completionRate || 0) * (project.expectedRevenue || 0) / 100),
                remainingAmount: Math.ceil((100 - (project.completionRate || 0)) * (project.expectedRevenue || 0) / 100),
                receivedPercentage: project.completionRate || 0
            },
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        };

        res.json(response);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Project not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @desc    Update project cover image
// @route   PUT /api/projects/:id/cover
// @access  Private
exports.updateProjectCover = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ msg: 'Please upload a file' });
        }

        const project = await Project.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!project) {
            return res.status(404).json({ msg: 'Project not found' });
        }

        // If there's an existing cover image, delete it from Cloudinary
        if (project.coverImageId) {
            try {
                await cloudinary.uploader.destroy(project.coverImageId);
            } catch (err) {
                console.error('Error deleting old cover image:', err);
            }
        }

        // Update project with new cover image
        project.coverImage = req.file.path;
        project.coverImageId = req.file.public_id;
        await project.save();

        res.json({
            success: true,
            coverImage: project.coverImage
        });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Project not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
    try {
        const { name, description, status, startDate, endDate, client, completionRate, expectedRevenue, remarks } = req.body;

        // Build project object
        const projectFields = {};
        if (name) projectFields.name = name;
        if (description) projectFields.description = description;
        if (status) projectFields.status = status;
        if (startDate) projectFields.startDate = startDate;
        if (endDate) projectFields.endDate = endDate;
        if (client) projectFields.client = client;
        if (completionRate !== undefined) projectFields.completionRate = completionRate;
        if (expectedRevenue !== undefined) projectFields.expectedRevenue = expectedRevenue;
        if (remarks) projectFields.remarks = remarks;

        const project = await Project.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!project) {
            return res.status(404).json({ msg: 'Project not found' });
        }

        // Update project
        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            { $set: projectFields },
            { new: true }
        );

        res.json(updatedProject);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Project not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!project) {
            return res.status(404).json({ msg: 'Project not found' });
        }

        res.json({ msg: 'Project deleted' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Project not found' });
        }
        res.status(500).send('Server Error');
    }
};
