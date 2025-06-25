const EmailService = require('../services/emailService');

// @desc    Test SMTP connection
// @route   GET /api/email/test
// @access  Private
exports.testSMTPConnection = async (req, res) => {
    try {
        // Create a test transporter
        const transporter = EmailService.getTransporter();
        
        if (!transporter) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create SMTP transporter. Check your email configuration.'
            });
        }

        // Test the connection
        const isConnected = await new Promise((resolve) => {
            transporter.verify((error) => {
                if (error) {
                    console.error('SMTP connection test failed:', error);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });

        if (!isConnected) {
            throw new Error('Failed to establish SMTP connection');
        }

        res.status(200).json({
            success: true,
            message: 'SMTP connection successful',
            config: {
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: process.env.EMAIL_SECURE,
                user: process.env.EMAIL_USER
            }
        });
    } catch (error) {
        console.error('Error testing SMTP connection:', error);
        res.status(500).json({
            success: false,
            message: 'SMTP connection test failed',
            error: error.message,
            details: {
                code: error.code,
                command: error.command,
                response: error.response
            }
        });
    }
};

// @desc    Send a test email
// @route   POST /api/email/test
// @access  Private
exports.sendTestEmail = async (req, res) => {
    try {
        const { to = 'test@example.com' } = req.body;
        
        const result = await EmailService.sendEmail({
            from: process.env.EMAIL_USER,
            fromName: 'Cubicle Test',
            to: [{ email: to }],
            subject: 'Test Email from Cubicle',
            html: '<h1>Test Email</h1><p>This is a test email from Cubicle.</p>',
            text: 'This is a test email from Cubicle.',
            userId: req.user.id
        });

        if (!result.success) {
            throw new Error(result.message || 'Failed to send test email');
        }

        res.status(200).json({
            success: true,
            message: 'Test email sent successfully',
            data: result
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
};
