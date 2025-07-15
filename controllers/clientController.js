const Client = require('../models/Client');

// @desc    Create a new client
// @route   POST /api/clients
// @access  Private
exports.createClient = async (req, res) => {
    try {
        const { name, email, contactNumber, address, organisation, remarks } = req.body;

        // Validate required fields
        if (!name || !contactNumber || !email) {
            return res.status(400).json({ msg: 'Please include name, email, and contact number.' });
        }

        // Create new client
        const client = new Client({
            user: req.user.id,
            name,
            email,
            contactNumber,
            address,
            organisation,
            remarks
        });

        // If profile image was uploaded, update the client with the Cloudinary URL
        if (req.file) {
            client.profileImage = req.file.path;
            client.profileImageId = req.file.public_id;
        }

        await client.save();
        res.status(201).json(client);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all clients for current user
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
    console.log("Getting clients for user:", req.user.id);
    try {
        const clients = await Client.find({ user: req.user.id });
        res.json(clients);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');

exports.getClient = async (req, res) => {
    console.log("Getting client for user:", req.user.id);
    try {
        const client = await Client.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!client) {
            return res.status(404).json({ msg: 'Client not found' });
        }
       
        // Fetch related projects and invoices
        const projects = await Project.find({ client: client._id, user: req.user.id });
        const invoices = await Invoice.find({ client: client._id, user: req.user.id });
        console.log(projects);
        console.log(invoices);
        console.log(client);
        
        res.json({
            client,
            projects,
            invoices
        });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Client not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
exports.updateClient = async (req, res) => {
    try {
        const { name, email, contactNumber, address, organisation, remarks } = req.body;

        // Build client object
        const clientFields = {};
        if (name) clientFields.name = name;
        if (email) clientFields.email = email;
        if (contactNumber) clientFields.contactNumber = contactNumber;
        if (address) clientFields.address = address;
        if (organisation) clientFields.organisation = organisation;
        if (remarks) clientFields.remarks = remarks;

        const client = await Client.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!client) {
            return res.status(404).json({ msg: 'Client not found' });
        }

        // Handle profile image update if new file is uploaded
        if (req.file) {
            // Delete old image from Cloudinary if it exists
            if (client.profileImageId) {
                try {
                    await cloudinary.uploader.destroy(client.profileImageId);
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }
            
            // Update with new image
            clientFields.profileImage = req.file.path;
            clientFields.profileImageId = req.file.public_id;
        }

        // Update client and get the updated version
        const updatedClient = await Client.findByIdAndUpdate(
            req.params.id,
            { $set: clientFields },
            { new: true }
        );

        res.json(updatedClient);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Client not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
exports.deleteClient = async (req, res) => {
    try {
        // First find the client to check ownership and get image ID
        const client = await Client.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!client) {
            return res.status(404).json({ msg: 'Client not found' });
        }

        // Delete client's profile image from Cloudinary if it exists
        if (client.profileImageId) {
            try {
                await cloudinary.uploader.destroy(client.profileImageId);
            } catch (err) {
                console.error('Error deleting client image:', err);
            }
        }

        // Delete client using findByIdAndDelete
        await Client.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Client deleted' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Client not found' });
        }
        res.status(500).send('Server Error');
    }
};
