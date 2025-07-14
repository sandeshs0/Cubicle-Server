require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

// Connect to Database
connectDB();

const passport = require('passport');

// Passport config
require('./config/passport')(passport);

const app = express();

// Init Middleware
app.use(cors());
app.use(express.json({ extended: false }));

// Passport middleware
app.use(passport.initialize());

app.get('/', (req, res) => res.send('API Running'));

// Define Routes
const auth = require('./middleware/auth');

// Public Routes
app.use('/api/auth', require('./routes/auth'));

// Protected Routes (require authentication)
app.use('/api/users', auth, require('./routes/users'));
app.use('/api/profile', auth, require('./routes/profile'));
app.use('/api/clients', auth, require('./routes/clients'));
app.use('/api/emails', auth, require('./routes/emails'));
app.use('/api/email', require('./routes/testEmail')); // Test email routes
app.use('/api/projects', auth, require('./routes/projects'));
app.use('/api/email-accounts', auth, require('./routes/emailAccounts'));
app.use('/api/ai', auth, require('./routes/ai'));
app.use('/api/boards', auth, require('./routes/board'));
app.use('/api/columns', auth, require('./routes/column'));
app.use('/api/tasks', auth, require('./routes/task'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/notifications', auth, require('./routes/notifications'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

module.exports = app;
