const notificationUtil = require('../utils/notificationUtil');

// Get notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    const notifications = await notificationUtil.getNotifications(req.user.id, parseInt(limit), parseInt(skip));
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Mark a single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await notificationUtil.markAsRead(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Mark all notifications as read for current user
exports.markAllAsRead = async (req, res) => {
  try {
    await notificationUtil.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
