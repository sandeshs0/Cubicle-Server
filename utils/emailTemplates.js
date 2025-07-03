/**
 * Generates a branded HTML email template
 * @param {Object} options - Email options
 * @param {string} options.senderName - Name of the sender
 * @param {string} options.message - The email message content (HTML)
 * @param {string} [options.footerText=''] - Additional footer text
 * @returns {string} - Formatted HTML email
 */
const generateEmailTemplate = ({ senderName, message, footerText = "" }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message from ${senderName} via Cubicle</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 2px solid #4a90e2;
                margin-bottom: 25px;
            }
            .logo {
                color: #4a90e2;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .content {
                background-color: #f9f9f9;
                padding: 25px;
                border-radius: 5px;
                margin-bottom: 25px;
            }
            .message {
                margin-bottom: 20px;
                line-height: 1.8;
            }
            .signature {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                color: #666666;
            }
            .footer {
                text-align: center;
                font-size: 12px;
                color: #999999;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
            }
            .button {
                display: inline-block;
                padding: 10px 20px;
                margin: 20px 0;
                background-color: #4a90e2;
                color: white !important;
                text-decoration: none;
                border-radius: 4px;
                font-weight: 500;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">Cubicle</div>
            <div style="color: #666666;">Smart CRM for Modern Teams</div>
        </div>
        
        <div class="content">
            <div style="font-size: 18px; font-weight: 500; margin-bottom: 15px;">
                Message from ${senderName}
            </div>
            
            <div class="message">
                ${message}
            </div>
            
            <div class="signature">
                <div>Best regards,</div>
                <div style="font-weight: 500;">${senderName}</div>
                <div>Sent via Cubicle CRM</div>
            </div>
        </div>
        
        <div class="footer">
        <img src="https://cubicle-server.onrender.com/api/email/track" height="1" width="1">
            ${
              footerText
                ? `<div style="margin-bottom: 10px;">${footerText}</div>`
                : ""
            }
            <div>© ${new Date().getFullYear()} Cubicle. All rights reserved.</div>
        </div>
    </body>
    </html>
    `;
};

module.exports = {
  generateEmailTemplate,
};
