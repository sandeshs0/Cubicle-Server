const EmailService = require("../services/emailService");
const Email = require("../models/Email");
const { validationResult } = require("express-validator");

// @desc    Send an email
// @route   POST /api/emails
// @access  Private
exports.sendEmail = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: errors.array(),
      });
    }

    // Parse recipients if it's a string (from form-data)
    let recipients = [];
    if (typeof req.body.to === "string") {
      try {
        // Try to parse if it's a JSON string
        recipients = JSON.parse(req.body.to);
        if (!Array.isArray(recipients)) {
          recipients = [recipients];
        }
      } catch (e) {
        // If not JSON, treat as a single email string
        recipients = [{ email: req.body.to }];
      }
    } else if (Array.isArray(req.body.to)) {
      recipients = req.body.to;
    } else if (req.body.to) {
      recipients = [req.body.to];
    }

    const { subject, body, projectId, clientId } = req.body;
    let attachments = [];

    // Handle uploaded files from multer
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => {
        // Get the Cloudinary URL from the file object
        const cloudinaryUrl = file.path || file.location || file.url;
        return {
          filename: file.originalname,
          path: cloudinaryUrl, // Use Cloudinary URL
          contentType: file.mimetype,
          size: file.size,
        };
      });
    } else if (req.body.attachments) {
      // Handle direct URLs if needed
      // Handle case where attachments are sent as URLs in the request body
      try {
        const urlAttachments = Array.isArray(req.body.attachments)
          ? req.body.attachments
          : [req.body.attachments];

        attachments = urlAttachments.map((url) => ({
          filename: url.split("/").pop() || "attachment",
          path: url,
          contentType: "application/octet-stream",
        }));
      } catch (error) {
        console.error("Error processing attachments:", error);
      }
    }

    // Get sender's name from user object
    const senderName = req.user.name || req.user.username || "Cubicle User";

    // Prepare email data
    const emailData = {
      to: recipients.map((recipient) => {
        // Handle both string and object formats
        if (typeof recipient === "string") {
          return { email: recipient.trim(), name: "" };
        }
        return {
          email: (recipient.email || "").trim(),
          name: (recipient.name || "").trim(),
        };
      }),
      subject: subject || "",
      html: body || "",
      fromName: senderName, // Add sender's name
      userId: req.user.id,
      projectId: projectId || null,
      clientId: clientId || null,
      attachments,
    };

    // Send email
    const result = await EmailService.sendEmail(emailData);

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data: {
        ...result,
        messageId: result.messageId,
      },
    });
  } catch (err) {
    console.error("Error in sendEmail:", err);
    res.status(500).json({
      msg: "Server error",
      error: err.message,
    });
  }
};

// @desc    Get user's sent emails
// @route   GET /api/emails
// @access  Private
exports.getUserEmails = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const result = await EmailService.getUserEmails(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    res.json({
      success: true,
      count: result.emails.length,
      pagination: result.pagination,
      data: result.emails,
    });
  } catch (err) {
    console.error("Error in getUserEmails:", err);
    res.status(500).json({
      success: false,
      msg: "Server error",
      error: err.message,
    });
  }
};

// @desc    Get email by ID
// @route   GET /api/emails/:id
// @access  Private
exports.getEmailById = async (req, res) => {
  try {
    const email = await EmailService.getEmailById(req.params.id, req.user.id);

    if (!email) {
      return res.status(404).json({
        success: false,
        msg: "Email not found or access denied",
      });
    }

    res.json({
      success: true,
      data: email,
    });
  } catch (err) {
    console.error("Error in getEmailById:", err);
    res.status(500).json({
      success: false,
      msg: "Server error",
      error: err.message,
    });
  }
};

// @desc    Validate email sending request
// @route   (middleware)
// @access  Private
exports.validateEmailRequest = [
  // Validate recipients
  (req, res, next) => {
    if (
      !req.body.to ||
      !Array.isArray(req.body.to) ||
      req.body.to.length === 0
    ) {
      return res.status(400).json({
        success: false,
        msg: "At least one recipient is required",
      });
    }

    // Validate each recipient email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const recipient of req.body.to) {
      if (!emailRegex.test(recipient.email)) {
        return res.status(400).json({
          success: false,
          msg: `Invalid email address: ${recipient.email}`,
        });
      }
    }

    next();
  },

  // Validate subject and body
  (req, res, next) => {
    if (!req.body.subject || req.body.subject.trim() === "") {
      return res.status(400).json({
        success: false,
        msg: "Email subject is required",
      });
    }

    if (!req.body.body || req.body.body.trim() === "") {
      return res.status(400).json({
        success: false,
        msg: "Email body is required",
      });
    }

    next();
  },
];
