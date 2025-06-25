const nodemailer = require('nodemailer');
const https = require('https');
const fs = require('fs');
const path = require('path');
const Email = require('../models/Email');
const { generateEmailTemplate } = require('../utils/emailTemplates');

// Helper function to download file from URL
const downloadFile = (url) => {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const filename = path.basename(url).split('?')[0];
        const filePath = path.join(tempDir, filename);
        const file = fs.createWriteStream(filePath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download file: ${response.statusCode}`));
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close(() => {
                    resolve({
                        path: filePath,
                        filename: filename,
                        cleanup: () => fs.unlink(filePath, () => {})
                    });
                });
            });
            
        }).on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
};

// Simple transporter - matching the OTP email approach
const getTransporter = () => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // tls: {
            //     // Do not fail on invalid certs
            //     rejectUnauthorized: false,
            //     minVersion: 'TLSv1.2',
            //     ciphers: 'SSLv3',
            //     secureProtocol: 'TLSv1_2_method'
            // },
            // Connection settings
            // pool: true, // Use connection pooling
            // maxConnections: 3, // Reduced max connections
            // maxMessages: 50, // Reduced max messages per connection
            // connectionTimeout: 10000, // 10 seconds
            // socketTimeout: 30000, // 30 seconds
            // greetingTimeout: 10000, // 10 seconds
            // Debug mode if needed
            // debug: process.env.NODE_ENV === 'development',
            // Disable using TLS if server doesn't support it
            // ignoreTLS: process.env.EMAIL_IGNORE_TLS === 'true',
            // Force use of TLS if needed
            // requireTLS: process.env.EMAIL_REQUIRE_TLS !== 'false',
            // Add keepalive
            // dnsTimeout: 10000, // 10 seconds
            // Add retry logic
            // retryAttempts: 3,
            // retryDelay: 1000 // 1 second
        });

        // Add event listeners for better debugging
        // transporter.on('idle', () => {
        //     console.log('SMTP Connection is idle');
        // });

        // transporter.on('error', (error) => {
        //     console.error('SMTP Error:', error);
        // });

        // Verify connection configuration with retry logic
        // const verifyConnection = async (attempt = 1, maxAttempts = 3) => {
        //     try {
        //         await transporter.verify();
        //         console.log('SMTP Server is ready to take our messages');
        //         return true;
        //     } catch (error) {
        //         console.error(`SMTP Connection Error (Attempt ${attempt}/${maxAttempts}):`, error.message);
        //         if (attempt >= maxAttempts) {
        //             console.error('Max SMTP connection attempts reached');
        //             return false;
        //         }
        //         // Wait before retrying
        //         await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        //         return verifyConnection(attempt + 1, maxAttempts);
        //     }
        // };

        // // Don't block the application if verification fails
        // verifyConnection().catch(console.error);

        return transporter;
    } catch (error) {
        console.error('Error creating email transporter:', error);
        return null;
    }
};

const systemTransporter = getTransporter();

class EmailService {
    /**
     * Send an email using the system's SMTP server
     * @param {Object} options - Email options
     * @param {String} options.from - Sender email
     * @param {String} options.fromName - Sender name
     * @param {Array} options.to - Array of recipient objects with email and name
     * @param {String} options.subject - Email subject
     * @param {String} options.html - Email body (HTML)
     * @param {String} options.text - Plain text version (optional)
     * @param {String} userId - ID of the user sending the email
     * @param {String} projectId - Optional project ID
     * @param {String} clientId - Optional client ID
     * @returns {Promise<Object>} - Email sending result
     */
    static async sendEmail({
        from = process.env.EMAIL_USER,
        fromName = process.env.EMAIL_FROM_NAME || 'Cubicle',
        to,
        subject,
        html,
        text = '',
        userId,
        projectId = null,
        clientId = null,
        attachments = []
    }) {
        let emailRecord;
        try {
            console.log('Starting email send process...');
            
            // Validate required fields
            if (!to || !to.length) {
                throw new Error('At least one recipient is required');
            }
            if (!subject) {
                throw new Error('Email subject is required');
            }
            if (!html && !text) {
                throw new Error('Email content is required');
            }

            console.log('Creating email record...');
            // Create email record in database with 'draft' status initially
            emailRecord = new Email({
                sender: userId,
                recipients: to.map(recipient => ({
                    email: recipient.email,
                    name: recipient.name || ''
                })),
                subject,
                body: html || text,
                project: projectId,
                client: clientId,
                status: 'draft',  // Start with 'draft' status
                sentAt: new Date(),
                customEmailUsed: false,
                attachments: attachments.map(file => ({
                    filename: file.filename,
                    path: file.path,
                    contentType: file.contentType
                }))
            });
            
            // Save the draft first
            await emailRecord.save();

            // Save the email record
            await emailRecord.save();
            console.log('Email record saved with ID:', emailRecord._id);

            // Generate formatted HTML email
            const emailHtml = generateEmailTemplate({
                senderName: fromName,
                message: html || text,
                footerText: 'This email was sent from Cubicle CRM.'
            });

            // Prepare attachments
            const emailAttachments = [];
            const cleanupFiles = [];
            
            if (attachments && attachments.length > 0) {
                for (const file of attachments) {
                    try {
                        // For Cloudinary PDFs, download them first
                        if (file.path && file.path.includes('res.cloudinary.com') && file.path.toLowerCase().endsWith('.pdf')) {
                            console.log('Downloading PDF from Cloudinary:', file.path);
                            const downloadedFile = await downloadFile(file.path);
                            cleanupFiles.push(downloadedFile.cleanup);
                            
                            emailAttachments.push({
                                filename: file.filename || path.basename(file.path).split('?')[0] || 'document.pdf',
                                path: downloadedFile.path,
                                contentType: 'application/pdf'
                            });
                        } 
                        // For Cloudinary images, use the URL directly
                        else if (file.path && file.path.includes('res.cloudinary.com')) {
                            emailAttachments.push({
                                filename: file.filename || 'image',
                                path: file.path,
                                contentType: file.contentType || 'image/jpeg',
                                headers: {
                                    'Content-ID': `<${file.filename || 'image'}>`
                                }
                            });
                        }
                        // For local files
                        else if (file.path) {
                            emailAttachments.push({
                                filename: file.filename || path.basename(file.path) || 'attachment',
                                path: file.path,
                                contentType: file.contentType || 'application/octet-stream'
                            });
                        }
                        // For in-memory buffers
                        else if (file.buffer) {
                            emailAttachments.push({
                                filename: file.filename || 'attachment',
                                content: file.buffer,
                                contentType: file.mimetype || 'application/octet-stream',
                                encoding: 'base64'
                            });
                        }
                    } catch (error) {
                        console.error('Error processing attachment:', error);
                        // Continue with other attachments even if one fails
                    }
                }
            }

            // Prepare email options for nodemailer
            const mailOptions = {
                from: `\"${fromName} via Cubicle\" <${from}>`,
                to: to.map(recipient => recipient.email).join(', '),
                subject: subject,
                text: text || (html ? html.replace(/<[^>]*>?/gm, '') : ''), // Plain text version
                html: emailHtml,
                attachments: emailAttachments.length > 0 ? emailAttachments : undefined
            };

            console.log('Sending email with options:', {
                to: mailOptions.to,
                subject: mailOptions.subject,
                attachmentCount: emailAttachments.length
            });

            try {
                // Send the email with a timeout
                const sendEmailPromise = systemTransporter.sendMail(mailOptions);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Email sending timed out after 30 seconds')), 50000)
                );
                
                const info = await Promise.race([sendEmailPromise, timeoutPromise]);
                console.log('Email sent successfully, messageId:', info.messageId);

                // Update email status to sent
                emailRecord.status = 'sent';
                emailRecord.sentAt = new Date();
                emailRecord.messageId = info.messageId;
                await emailRecord.save();

                // Clean up downloaded files
                cleanupFiles.forEach(cleanup => cleanup());

                return {
                    success: true,
                    message: 'Email sent successfully',
                    emailId: emailRecord._id,
                    messageId: info.messageId
                };
            } catch (error) {
                console.error('Error sending email:', error);
                // Clean up any downloaded files even if sending fails
                cleanupFiles.forEach(cleanup => cleanup());
                throw error;
            }
        } catch (error) {
            console.error('Error sending email:', error);
            
            // Update the email record with error status if it was created
            if (emailRecord) {
                try {
                    emailRecord.status = 'failed';
                    emailRecord.error = {
                        message: error.message,
                        code: error.code,
                        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                    };
                    await emailRecord.save();
                } catch (saveError) {
                    console.error('Error updating email record with error status:', saveError);
                }
            }
            
            // Re-throw the error to be handled by the controller
            throw error;
        }
    }

    /**
     * Get emails sent by a user
     * @param {String} userId - User ID
     * @param {Object} options - Query options (limit, page, etc.)
     * @returns {Promise<Array>} - List of emails
     */
    static async getUserEmails(userId, { limit = 10, page = 1, status } = {}) {
        try {
            const query = { sender: userId };
            if (status) query.status = status;

            const emails = await Email.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .populate('project', 'name')
                .populate('client', 'name email');

            const total = await Email.countDocuments(query);

            return {
                emails,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    limit: parseInt(limit)
                }
            };
        } catch (error) {
            console.error('Error fetching emails:', error);
            throw error;
        }
    }

    /**
     * Get email details by ID
     * @param {String} emailId - Email ID
     * @param {String} userId - User ID for authorization
     * @returns {Promise<Object>} - Email details
     */
    static async getEmailById(emailId, userId) {
        try {
            const email = await Email.findOne({
                _id: emailId,
                sender: userId
            })
            .populate('project', 'name')
            .populate('client', 'name email');

            if (!email) {
                throw new Error('Email not found or access denied');
            }

            return email;
        } catch (error) {
            console.error('Error fetching email:', error);
            throw error;
        }
    }
}

module.exports = EmailService;
