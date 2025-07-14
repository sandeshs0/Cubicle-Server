const Notification = require('../models/Notification');

/**
 * Create and save a notification
 * @param {Object} params
 * @param {String} params.user - User ID to notify
 * @param {String} params.type - Notification type (e.g. 'payment_logged')
 * @param {String} params.message - Notification message
 * @param {Object} [params.data] - Extra data (e.g. invoiceId, paymentId)
 * @returns {Promise<Notification>}
 */
async function createNotification({ user, type, message, data = {} }) {
  if (!user || !type || !message) throw new Error('user, type, and message are required');
  const notification = new Notification({ user, type, message, data });
  return await notification.save();
}

/**
 * Mark a notification as read
 * @param {String} notificationId
 * @returns {Promise<Notification>}
 */
async function markAsRead(notificationId) {
  return await Notification.findByIdAndUpdate(notificationId, { read: true }, { new: true });
}

/**
 * Mark all notifications as read for a user
 * @param {String} userId
 * @returns {Promise<{ n: number, nModified: number, ok: number }>}
 */
async function markAllAsRead(userId) {
  return await Notification.updateMany({ user: userId, read: false }, { read: true });
}

/**
 * Get notifications for a user (paginated)
 * @param {String} userId
 * @param {Number} [limit=20]
 * @param {Number} [skip=0]
 * @returns {Promise<Notification[]>}
 */
async function getNotifications(userId, limit = 20, skip = 0) {
  return await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
}

module.exports = {
  createNotification,
  markAsRead,
  markAllAsRead,
  getNotifications
};
