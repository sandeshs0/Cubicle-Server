const Email = require('../models/Email');

// @desc    Get email statistics
// @route   GET /api/emails/stats
// @access  Private
exports.getEmailStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const totalEmails = await Email.countDocuments({ sender: userId });
    const sentEmails = await Email.countDocuments({ sender: userId, status: 'sent' });
    const openedEmails = await Email.countDocuments({ sender: userId, opened: true });
    const failedEmails = await Email.countDocuments({ sender: userId, status: 'failed' });
    const draftEmails = await Email.countDocuments({ sender: userId, status: 'draft' });
    const scheduledEmails = await Email.countDocuments({ sender: userId, status: 'scheduled' });
    // You can add more status types as needed

    res.json({
      success: true,
      data: {
        totalEmails,
        sentEmails,
        openedEmails,
        failedEmails,
        draftEmails,
        scheduledEmails
      }
    });
  } catch (error) {
    console.error('Error getting email stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching email statistics',
      error: error.message
    });
  }
};
