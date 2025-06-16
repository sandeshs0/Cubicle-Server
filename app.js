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
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

module.exports = app;
