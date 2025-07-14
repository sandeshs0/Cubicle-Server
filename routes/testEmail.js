const express = require("express");
const router = express.Router();
const {
  testSMTPConnection,
  sendTestEmail,
} = require("../controllers/testEmailController");
const auth = require("../middleware/auth");
const Email = require("../models/Email");
const {createNotification} = require("../utils/notificationUtil");

// @route   GET /api/email/test/connection
// @desc    Test SMTP connection
// @access  Private
router.get("/test/connection", auth, testSMTPConnection);

// @route   POST /api/email/test/send
// @desc    Send a test email
// @access  Private
router.post("/test/send", auth, sendTestEmail);

router.get("/track/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update the email's opened status and set openedAt timestamp
    const updatedEmail = await Email.findByIdAndUpdate(
      id,
      { 
        $set: { 
          opened: true,
          openedAt: new Date() 
        } 
      },
      { new: true }
    );
    console.log(updatedEmail);
    console.log(updatedEmail.sender.name);
    await createNotification({
      user: updatedEmail.sender._id,
      type: 'email_opened',
      message: `Email was opened: ${updatedEmail.subject}`,
      data: { emailId: updatedEmail._id }
    });

    if (!updatedEmail) {
      return res.status(404).json({ success: false, message: "Email not found" });
    }

    console.log(`Email ${id} marked as opened`);
    
    // Return a transparent 1x1 pixel for tracking
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    return res.end(pixel);
    
  } catch (error) {
    console.error('Error tracking email open:', error);
    // Still return the tracking pixel even if there's an error
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length
    });
    return res.end(pixel);
  }
});



module.exports = router;
