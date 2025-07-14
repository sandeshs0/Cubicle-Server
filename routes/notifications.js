const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Get notifications for current user
router.get('/', auth, notificationController.getNotifications);

// Mark a notification as read
router.patch('/:id/read', auth, notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', auth, notificationController.markAllAsRead);

module.exports = router;
