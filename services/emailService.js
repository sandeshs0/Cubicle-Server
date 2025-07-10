const nodemailer = require("nodemailer");
const https = require("https");
const fs = require("fs");
const path = require("path");
const Email = require("../models/Email");
const EmailAccount = require("../models/EmailAccount");
const { generateEmailTemplate } = require("../utils/emailTemplates");
const { transporter } = require("../services/emailService");

// Helper function to download file from URL
const downloadFile = (url) => {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filename = path.basename(url).split("?")[0];
    const filePath = path.join(tempDir, filename);
    const file = fs.createWriteStream(filePath);

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          return reject(
            new Error(`Failed to download file: ${response.statusCode}`)
          );
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close(() => {
            resolve({
              path: filePath,
              filename: filename,
              cleanup: () => fs.unlink(filePath, () => {}),
            });
          });
        });
      })
      .on("error", (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
  });
};

// Get transporter based on user's email account or system default
const getTransporter = async (userId = null) => {
  try {
    // If userId is provided, try to get user's default email account
    console.log("searching for email account for userId: ", userId);
    if (userId) {
      const emailAccount = await EmailAccount.findOne({
        user: userId,
        // isDefault: true,
        verified: true,
      }).select("+auth.pass"); // Include the encrypted password

      console.log("emailAccount: ", emailAccount);
      if (emailAccount) {
        // const decryptedPass = emailAccount.decryptPassword();
        console.log("found user custom email: ", emailAccount.auth);
        if (emailAccount.auth.pass) {
          console.log(`Using custom email account: ${emailAccount.email}`);

          const customTransporter = nodemailer.createTransport({
            host: emailAccount.smtp.host,
            port: emailAccount.smtp.port,
            // secure: emailAccount.smtp.secure,
            auth: {
              user: emailAccount.auth.user,
              pass: emailAccount.auth.pass,
            },
            // tls: {
            //     // Do not fail on invalid certs
            //     rejectUnauthorized: false
            // },
            // pool: true,
            // maxConnections: 5,
            // maxMessages: 100,
            // connectionTimeout: 10000, // 10 seconds
            // socketTimeout: 60000, // 60 seconds
            // greetingTimeout: 10000, // 10 seconds
            // // Add keepalive
            // dnsTimeout: 10000, // 10 seconds
            // // Add debug logging
            // debug: process.env.NODE_ENV === 'development'
          });

          return {
            transporter: customTransporter,
            fromEmail: emailAccount.email,
            fromName: emailAccount.displayName,
            isCustom: true,
            accountId: emailAccount._id,
          };
        }
      }
    }

    // Fall back to system email
    console.log("Using system default email account");
    return {
      transporter: nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        // secure: process.env.EMAIL_SECURE === 'true',
        // requireTLS:true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        // tls: {
        // rejectUnauthorized: false
        // },
        // connectionTimeout: 30000, // 30 seconds
        // greetingTimeout: 30000,   // 30 seconds
        // socketTimeout: 30000,     // 30 seconds
        // debug: true,              // Enable debug output
        logger: true,
      }),
      fromEmail: process.env.EMAIL_USER,
      fromName: process.env.EMAIL_FROM_NAME || "Cubicle",
      isCustom: false,
    };
  } catch (error) {
    console.error("Error creating email transporter:", error);
    throw error;
  }
};

class EmailService {
  /**
   * Send an email using either the user's custom SMTP or system's SMTP server
   * @param {Object} options - Email options
   * @param {String} options.from - Sender email (optional, will use account email if not provided)
   * @param {String} options.fromName - Sender name (optional, will use account display name if not provided)
   * @param {Array} options.to - Array of recipient objects with email and name
   * @param {String} options.subject - Email subject
   * @param {String} options.html - Email body (HTML)
   * @param {String} options.text - Plain text version (optional)
   * @param {String} userId - ID of the user sending the email
   * @param {String} projectId - Optional project ID
   * @param {String} clientId - Optional client ID
   * @param {Array} options.attachments - Array of attachment objects
   * @returns {Promise<Object>} - Email sending result
   */
  static async sendEmail({
    from,
    fromName,
    to,
    subject,
    html,
    text = "",
    userId,
    projectId = null,
    clientId = null,
    attachments = [],
  }) {
    let emailRecord;
    let emailTransporter;
    let customEmailAccountId = null;

    try {
      console.log("Starting email send process...");

      // Validate required fields
      if (!to || !to.length) {
        throw new Error("At least one recipient is required");
      }
      if (!subject) {
        throw new Error("Email subject is required");
      }
      if (!html && !text) {
        throw new Error("Email content is required");
      }

      console.log("Getting email transporter...", userId);
      // Get appropriate transporter (custom or system)
      const transporterInfo = await getTransporter(userId);
      emailTransporter = transporterInfo.transporter;

      // Set from email and name
      const fromEmail = from || transporterInfo.fromEmail;
      const senderName = fromName || transporterInfo.fromName;
      customEmailAccountId = transporterInfo.isCustom
        ? transporterInfo.accountId
        : null;

      console.log("Creating email record...");
      // Create email record in database with 'draft' status initially
      emailRecord = new Email({
        sender: userId,
        recipients: to.map((recipient) => ({
          email: recipient.email,
          name: recipient.name || "",
        })),
        from: fromEmail,
        fromName: senderName,
        subject,
        body: html || text,
        project: projectId,
        client: clientId,
        status: "draft", // Start with 'sending' status
        sentAt: new Date(),
        customEmailAccount: customEmailAccountId,
        attachments: attachments.map((file) => ({
          filename: file.filename,
          path: file.path,
          contentType: file.contentType,
        })),
      });

      // Save the email record
      await emailRecord.save();
      console.log("Email record saved with ID:", emailRecord._id);

      // Generate formatted HTML email
      const emailHtml = generateEmailTemplate({
        senderName: senderName,
        message: html || text,
        footerText: "This email was sent from Cubicle CRM.",
        emailId: emailRecord._id.toString(),
      });

      // Prepare attachments
      const emailAttachments = [];
      const cleanupFiles = [];

      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          try {
            // For Cloudinary PDFs, download them first
            if (
              file.path &&
              file.path.includes("res.cloudinary.com") &&
              file.path.toLowerCase().endsWith(".pdf")
            ) {
              console.log("Downloading PDF from Cloudinary:", file.path);
              const downloadedFile = await downloadFile(file.path);
              cleanupFiles.push(downloadedFile.cleanup);

              emailAttachments.push({
                filename:
                  file.filename ||
                  path.basename(file.path).split("?")[0] ||
                  "document.pdf",
                path: downloadedFile.path,
                contentType: "application/pdf",
              });
            }
            // For Cloudinary images, use the URL directly
            else if (file.path && file.path.includes("res.cloudinary.com")) {
              emailAttachments.push({
                filename: file.filename || "image",
                path: file.path,
                contentType: file.contentType || "image/jpeg",
                headers: {
                  "Content-ID": `<${file.filename || "image"}>`,
                },
              });
            }
            // For local files
            else if (file.path) {
              emailAttachments.push({
                filename:
                  file.filename || path.basename(file.path) || "attachment",
                path: file.path,
                contentType: file.contentType || "application/octet-stream",
              });
            }
            // For in-memory buffers
            else if (file.buffer) {
              emailAttachments.push({
                filename: file.filename || "attachment",
                content: file.buffer,
                contentType: file.mimetype || "application/octet-stream",
                encoding: "base64",
              });
            }
          } catch (error) {
            console.error("Error processing attachment:", error);
            // Continue with other attachments even if one fails
          }
        }
      }

      // Prepare email options for nodemailer
      const mailOptions = {
        from: `"${senderName}" <${fromEmail}>`,
        to: to.map((recipient) => recipient.email).join(", "),
        subject: subject,
        text: text || (html ? html.replace(/<[^>]*>?/gm, "") : ""),
        html: emailHtml,
        attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
      };

      console.log("Sending email with options:", {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        attachmentCount: emailAttachments.length,
        usingCustomAccount: !!customEmailAccountId,
      });

      // Send the email with a timeout
      const sendEmailPromise = emailTransporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Email sending timed out after 50 seconds")),
          50000
        )
      );

      const info = await Promise.race([sendEmailPromise, timeoutPromise]);
      console.log("Email sent successfully, messageId:", info.messageId);

      // Update email status to sent
      emailRecord.status = "sent";
      emailRecord.sentAt = new Date();
      emailRecord.messageId = info.messageId;
      await emailRecord.save();

      // Clean up downloaded files
      cleanupFiles.forEach((cleanup) => cleanup());

      return {
        success: true,
        message: "Email sent successfully",
        emailId: emailRecord._id,
        messageId: info.messageId,
        usedCustomAccount: !!customEmailAccountId,
      };
    } catch (error) {
      console.error("Error in email service:", error);

      // Update the email record with error status if it was created
      if (emailRecord) {
        try {
          emailRecord.status = "failed";
          emailRecord.error = {
            message: error.message,
            code: error.code,
            stack:
              process.env.NODE_ENV === "development" ? error.stack : undefined,
          };
          await emailRecord.save();
        } catch (saveError) {
          console.error(
            "Error updating email record with error status:",
            saveError
          );
        }
      }

      // If the error is related to custom email account, try with system account
      if (
        customEmailAccountId &&
        error.code &&
        ["EAUTH", "EENVELOPE", "ECONNECTION"].includes(error.code)
      ) {
        console.log(
          "Custom email account failed, retrying with system account..."
        );
        return this.sendEmail({
          from: process.env.EMAIL_USER,
          fromName: process.env.EMAIL_FROM_NAME,
          to,
          subject: `[System] ${subject}`, // Add prefix to indicate system-sent
          html,
          text,
          userId,
          projectId,
          clientId,
          attachments,
        });
      }

      // Re-throw the error to be handled by the controller
      throw error;
    }
  }

  // ... rest of the class methods remain the same ...
  static async getUserEmails(userId, { limit = 10, page = 1, status } = {}) {
    try {
      const query = { sender: userId };
      if (status) query.status = status;

      const total = await Email.countDocuments(query);

      const emails = await Email.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("project", "name")
        .populate("client", "name email")
        .populate({
          path: "customEmailAccount",
          select: "email displayName",
          options: { strictPopulate: false },
        });

      return {
        emails,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      };
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
    }
  }

  static async getEmailById(emailId, userId) {
    try {
      const email = await Email.findOne({
        _id: emailId,
        sender: userId,
      })
        .populate("project", "name")
        .populate("client", "name email")
        .populate({
          path: "customEmailAccount",
          select: "email displayName smtp.host",
          options: { strictPopulate: false },
        });

      if (!email) {
        throw new Error("Email not found or access denied");
      }

      return email;
    } catch (error) {
      console.error("Error fetching email:", error);
      throw error;
    }
  }

  /**
   * Simple email sending function without templates or database records
   * @param {Object} options - Email options
   * @param {String|Array} options.to - Recipient email(s)
   * @param {String} options.subject - Email subject
   * @param {String} options.html - Email HTML content
   * @param {String} [options.from] - Sender email
   * @param {String} [options.fromName] - Sender name
   * @param {String} [options.trackingId] - Optional tracking ID
   * @param {String} [options.userId] - Optional user ID for custom email account
   * @returns {Promise<Object>} - Send result
   */
  static sendPlainEmail = async ({
    to,
    subject,
    html,
    from,
    fromName,
    trackingId,
    userId
  }) => {
    try {
      console.log('Sending plain email...');
      
      // Get appropriate transporter (custom or system)
      const transporterInfo = await getTransporter(userId);
      // const { transporter, fromEmail, fromName: systemFromName } = transporterInfo;
      const transporter=transporterInfo.transporter;

      const fromEmail =transporterInfo.fromEmail;
      const fromName= transporterInfo.fromName;


      // Use provided from/name or fall back to system/account defaults


      const senderEmail = from || fromEmail;
      const senderName = fromName || systemFromName;
      
      // Format recipients - handle both string and array of objects
      const formatRecipients = (recipients) => {
        if (!Array.isArray(recipients)) return recipients;
        return recipients.map(r => typeof r === 'string' ? r : r.email || '').filter(Boolean).join(', ');
      };
      
      // Prepare email options
      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: formatRecipients(to),
        subject,
        html,
        // Add tracking headers if trackingId is provided
        ...(trackingId && {
          headers: {
            'X-Tracking-ID': trackingId,
            ...(transporterInfo.messageId && { 'Message-ID': transporterInfo.messageId })
          }
        })
      };
      
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        customEmailUsed: !!transporterInfo.isCustom
      };
    } catch (error) {
      console.error('Error sending plain email:', error);
      throw error;
    }
  }

}


module.exports = EmailService;
