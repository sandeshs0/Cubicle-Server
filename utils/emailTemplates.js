/**
 * Generates a branded HTML email template
 * @param {Object} options - Email options
 * @param {string} options.senderName - Name of the sender
 * @param {string} options.message - The email message content (HTML)
 * @param {string} [options.footerText=''] - Additional footer text
 * @returns {string} - Formatted HTML email
 */
const generateEmailTemplate = ({
  senderName,
  message,
  emailId,
  footerText = "",
}) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Message from ${senderName}</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
          }
          .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .header {
              background-color: #4a6cf7;
              color: white;
              padding: 20px;
              text-align: center;
          }
          .logo {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
          }
          .content {
              padding: 30px;
          }
          .message {
              background-color: #f9f9f9;
              padding: 20px;
              border-radius: 4px;
              margin-bottom: 20px;
              line-height: 1.8;
          }
          .button {
              display: inline-block;
              padding: 10px 20px;
              background-color: #4a6cf7;
              color: white !important;
              text-decoration: none;
              border-radius: 4px;
              margin: 10px 0;
              font-weight: 500;
          }
          .footer {
              text-align: center;
              padding: 20px;
              font-size: 12px;
              color: #999999;
              background-color: #f9f9f9;
          }
          @media (max-width: 600px) {
              .container {
                  margin: 0;
                  border-radius: 0;
              }
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <div class="logo">Cubicle</div>
              <div style="color: #e0e0e0;">Smart CRM for Modern Teams</div>
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
              <div style="margin-bottom: 10px;">To track this email, click the link below:</div>
              <a href="https://cubicle-server.onrender.com/api/email/track/${emailId}" class="button">Mark as Open</a>
              <img src="https://cubicle-server.onrender.com/api/email/track/${emailId}" height="1" width="1">
              ${footerText ? `<div style="margin-bottom: 10px;">${footerText}</div>` : ""}
            <div> 2023 Cubicle. All rights reserved.</div>
        </div>
    </body>
    </html>
    `;
};

/**
 * Generates an invoice email template with tracking
 * @param {Object} options - Invoice email options
 * @param {Object} options.invoice - The invoice object
 * @param {string} options.message - Custom message to include in the email
 * @param {string} options.senderName - Name of the sender
 * @param {string} options.invoiceLink - Link to view the invoice online
 * @returns {string} - Formatted HTML email with invoice
 */
const generateInvoiceTemplate = ({
  invoice,
  message = 'Please find your invoice attached.',
  senderName,
  invoiceLink
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${invoice.invoiceNumber} from ${senderName}</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
          }
          .container {
              max-width: 800px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .header {
              background-color: #4a6cf7;
              color: white;
              padding: 20px;
              text-align: center;
          }
          .logo {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
          }
          .content {
              padding: 30px;
          }
          .message {
              background-color: #f9f9f9;
              padding: 20px;
              border-radius: 4px;
              margin-bottom: 20px;
              line-height: 1.8;
          }
          .button {
              display: inline-block;
              padding: 10px 20px;
              background-color: #4a6cf7;
              color: white !important;
              text-decoration: none;
              border-radius: 4px;
              margin: 10px 0;
              font-weight: 500;
          }
          .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              padding-bottom: 15px;
              border-bottom: 1px solid #eee;
          }
          .invoice-info {
              flex: 1;
          }
          .invoice-meta {
              text-align: right;
          }
          .invoice-details {
              margin: 30px 0;
          }
          table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
          }
          th, td {
              padding: 12px 15px;
              text-align: left;
              border-bottom: 1px solid #ddd;
          }
          th {
              background-color: #f8f9fa;
              font-weight: 600;
          }
          .text-right {
              text-align: right;
          }
          .totals {
              margin-left: auto;
              width: 300px;
          }
          .totals-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
          }
          .totals-label {
              font-weight: 500;
          }
          .totals-amount {
              font-weight: 600;
          }
          .grand-total {
              font-size: 1.2em;
              font-weight: 700;
              color: #4a6cf7;
              border-top: 2px solid #4a6cf7;
              padding-top: 10px;
              margin-top: 10px;
          }
          .footer {
              text-align: center;
              padding: 20px;
              font-size: 12px;
              color: #999999;
              background-color: #f9f9f9;
              margin-top: 30px;
          }
          .tracking-pixel {
              display: none;
          }
          @media (max-width: 600px) {
              .container {
                  margin: 0;
                  border-radius: 0;
              }
              .invoice-header {
                  flex-direction: column;
              }
              .invoice-meta {
                  text-align: left;
                  margin-top: 20px;
              }
              .totals {
                  width: 100%;
              }
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <div class="logo">Cubicle</div>
              <div style="color: #e0e0e0;">Smart CRM for Modern Teams</div>
          </div>
          
          <div class="content">
              <div class="message">
                  <p>${message}</p>
                  <p>You can view and download your invoice by clicking the button below:</p>
                  <a href="${invoiceLink}" class="button">View Invoice</a>
              </div>

              <div class="invoice-header">
                  <div class="invoice-info">
                      <h2>INVOICE</h2>
                      <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
                      <p><strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</p>
                      <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div class="invoice-meta">
                      <p><strong>Status:</strong> 
                          <span style="text-transform: capitalize;">${invoice.status}</span>
                      </p>
                      ${invoice.paidAt ? 
                        `<p><strong>Paid On:</strong> ${new Date(invoice.paidAt).toLocaleDateString()}</p>` : ''
                      }
                  </div>
              </div>

              <div class="invoice-details">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                      <div>
                          <h3>Bill To:</h3>
                          ${invoice.client ? `
                              <p>${invoice.client.name || 'Client Name Not Available'}</p>
                              ${invoice.billingAddress ? `
                                  <p>${invoice.billingAddress.street || ''}</p>
                                  <p>${invoice.billingAddress.city || ''} ${invoice.billingAddress.postalCode || ''}</p>
                                  <p>${invoice.billingAddress.country || ''}</p>
                              ` : ''}
                              ${invoice.client.email ? `<p>${invoice.client.email}</p>` : ''}
                              ${invoice.client.contactNumber ? `<p>${invoice.client.contactNumber}</p>` : ''}
                          ` : '<p>Client information not available</p>'}
                      </div>
                      <div>
                          <h3>From:</h3>
                          <p>${senderName}</p>
                          ${invoice.user.email ? `<p>${invoice.user.email}</p>` : ''}
                      </div>
                  </div>

                  <table>
                      <thead>
                          <tr>
                              <th>Description</th>
                              <th>Quantity</th>
                              <th>Unit Price</th>
                              <th class="text-right">Amount</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${invoice.items.map(item => `
                              <tr>
                                  <td>${item.description}</td>
                                  <td>${item.quantity}</td>
                                  <td>${formatCurrency(item.unitPrice)}</td>
                                  <td class="text-right">${formatCurrency(item.amount)}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>

                  <div class="totals">
                      <div class="totals-row">
                          <span class="totals-label">Subtotal:</span>
                          <span class="totals-amount">${formatCurrency(invoice.subtotal)}</span>
                      </div>
                      
                      ${invoice.taxAmount > 0 ? `
                          <div class="totals-row">
                              <span class="totals-label">
                                  Tax (${invoice.taxType === 'percentage' ? `${invoice.taxRate}%` : 'Fixed'}):
                              </span>
                              <span class="totals-amount">${formatCurrency(invoice.taxAmount)}</span>
                          </div>
                      ` : ''}
                      
                      ${invoice.discountAmount > 0 ? `
                          <div class="totals-row">
                              <span class="totals-label">
                                  Discount (${invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : 'Fixed'}):
                              </span>
                              <span class="totals-amount">-${formatCurrency(invoice.discountAmount)}</span>
                          </div>
                      ` : ''}
                      
                      <div class="totals-row grand-total">
                          <span>Total:</span>
                          <span>${formatCurrency(invoice.total)}</span>
                      </div>
                  </div>
              </div>

              ${invoice.paymentInstructions ? `
                  <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
                      <h3>Payment Instructions</h3>
                      <p>${invoice.paymentInstructions}</p>
                  </div>
              ` : ''}

              <div style="margin-top: 30px; text-align: center;">
                  <a href="${invoiceLink}" class="button" style="background-color: #4CAF50;">
                      Pay Now
                  </a>
                  <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
                      This invoice was sent by ${senderName} via Cubicle CRM.
                  </p>
              </div>
          </div>

          <div class="footer">
              <p>© ${new Date().getFullYear()} Cubicle. All rights reserved.</p>
              <p>
                  <a href="${invoiceLink}" style="color: #4a6cf7; text-decoration: none;">View in Browser</a>
                  | 
                  <a href="{{unsubscribe_url}}" style="color: #4a6cf7; text-decoration: none;">Unsubscribe</a>
              </p>
              <div class="tracking-pixel">
                  <img src="${process.env.BACKEND_URL || 'https://cubicle-server.onrender.com'}/api/invoices/track/${invoice.trackingId}" width="1" height="1" alt="">
              </div>
          </div>
      </div>
  </body>
  </html>
  `;
};

module.exports = {
  generateEmailTemplate,
  generateInvoiceTemplate
};
