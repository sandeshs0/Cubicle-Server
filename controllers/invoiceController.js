const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const User = require('../models/User');
const { sendPlainEmail } = require('../services/emailService');

// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const { items, ...invoiceData } = req.body;
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'At least one invoice item is required' });
    }
    
    // Calculate amount for each item and subtotal
    const itemsWithAmounts = items.map(item => ({
      ...item,
      amount: item.quantity * item.unitPrice
    }));
    
    const subtotal = itemsWithAmounts.reduce((sum, item) => sum + item.amount, 0);
    
    // Calculate tax
    let taxAmount = 0;
    if (invoiceData.taxType === 'percentage' && invoiceData.taxRate) {
      taxAmount = subtotal * (invoiceData.taxRate / 100);
    } else if (invoiceData.taxType === 'fixed' && invoiceData.taxRate) {
      taxAmount = invoiceData.taxRate;
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (invoiceData.discountType === 'percentage' && invoiceData.discountValue) {
      discountAmount = subtotal * (invoiceData.discountValue / 100);
    } else if (invoiceData.discountType === 'fixed' && invoiceData.discountValue) {
      discountAmount = invoiceData.discountValue;
    }
    
    // Calculate total
    const total = subtotal + taxAmount - discountAmount;
    
    // Generate invoice number
    const count = await Invoice.countDocuments();
    const randomString = require('crypto').randomBytes(4).toString('hex').toUpperCase();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${randomString}`;
    
    // Create new invoice
    const invoice = new Invoice({
      ...invoiceData,
      client: req.body.client, // Get client from request body
      items: itemsWithAmounts, // Use items with calculated amounts
      invoiceNumber, // Add auto-generated invoice number
      subtotal,
      taxAmount,
      discountAmount,
      total,
      user: req.user.id,
      status: 'draft',
      trackingId: require('crypto').randomBytes(16).toString('hex')
    });
    
    await invoice.save();
    
    // Populate client and user details
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('client', 'name email company')
      .populate('user', 'name email');
    
    res.status(201).json({
      success: true,
      data: populatedInvoice
    });
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const { status, client, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const query = { user: req.user.id };
    
    if (status) query.status = status;
    if (client) query.client = client;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const invoices = await Invoice.find(query)
      .populate('client', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const count = await Invoice.countDocuments(query);
    
    res.json({
      success: true,
      data: invoices,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
        hasNextPage: page * limit < count,
        hasPreviousPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id
    })
    .populate('client')
    .populate('project', 'name')
    .populate('user', 'name email');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      data: invoice
    });
    
  } catch (error) {
    console.error('Error getting invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message
    });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    const { items, ...updateData } = req.body;
    
    // Recalculate amounts if items are being updated
    if (items && items.length > 0) {
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
      
      updateData.subtotal = subtotal;
      updateData.items = items;
      
      // Recalculate tax
      if (updateData.taxType === 'percentage' && updateData.taxRate > 0) {
        updateData.taxAmount = (subtotal * updateData.taxRate) / 100;
      } else if (updateData.taxType === 'fixed') {
        updateData.taxAmount = updateData.taxRate;
      } else {
        updateData.taxAmount = 0;
      }
      
      // Recalculate discount
      if (updateData.discountType === 'percentage' && updateData.discountValue > 0) {
        updateData.discountAmount = (subtotal * updateData.discountValue) / 100;
      } else if (updateData.discountType === 'fixed') {
        updateData.discountAmount = updateData.discountValue;
      } else {
        updateData.discountAmount = 0;
      }
      
      // Recalculate total
      updateData.total = subtotal + (updateData.taxAmount || 0) - (updateData.discountAmount || 0);
    }
    
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updateData,
      { new: true, runValidators: true }
    )
    .populate('client')
    .populate('project', 'name');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      data: invoice
    });
    
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invoice',
      error: error.message
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      data: {}
    });
    
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting invoice',
      error: error.message
    });
  }
};

// @desc    Send invoice via email
// @route   POST /api/invoices/:id/send
// @access  Private
exports.sendInvoice = async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    // Find invoice with proper population
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id
    })
    .populate({
      path: 'client',
      select: 'name email company contactNumber billingAddress'
    })
    .populate({
      path: 'user',
      select: 'name email'
    });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Validate client data
    if (!invoice.client) {
      return res.status(400).json({
        success: false,
        message: 'Client information is missing for this invoice'
      });
    }

    // Prepare recipient email
    const recipientEmail = email || invoice.client.email;
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'No email address found for the recipient'
      });
    }
    
    // Add tracking pixel to the HTML content
    const trackingPixel = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center;">
        <p>This email was sent via Cubicle - Your Business Management Solution</p>
        <img src="${process.env.BACKEND_URL || 'http://localhost:5000'}/api/invoices/track/${invoice.trackingId}" 
             width="1" height="1" style="display:none;" alt="">
      </div>
    `;
    
    // Use the stored HTML content and append tracking pixel
    let emailContent = invoice.htmlContent;
    emailContent = emailContent.replace('</body>', `${trackingPixel}</body>`) || `${emailContent}${trackingPixel}`;
    
    // Format recipient as array of objects with email and name
    const recipient = [{
      email: recipientEmail,
      name: invoice.client?.name || 'Client'
    }];

    // Send email using the simple email service
    await sendPlainEmail({
      to: recipient,
      subject: subject || `Invoice #${invoice.invoiceNumber} from ${invoice.user?.name || 'Your Company'}`,
      html: emailContent,
      trackingId: invoice.trackingId,
      fromName: invoice.user?.name || 'Your Company',
      userId: invoice.user?.id
    });
    
    // Update invoice status and last sent date
    invoice.status = 'sent';
    invoice.lastSentAt = new Date();
    await invoice.save();
    
    res.json({
      success: true,
      message: 'Invoice sent successfully',
      data: invoice
    });
    
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invoice',
      error: error.message
    });
  }
};

// @desc    Track invoice view
// @route   GET /api/invoices/track/:trackingId
// @access  Public
exports.trackInvoiceView = async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    if (!trackingId) {
      return res.status(400).json({
        success: false,
        message: 'Tracking ID is required'
      });
    }
    
    const invoice = await Invoice.findOneAndUpdate(
      { trackingId },
      {
        $inc: { viewCount: 1 },
        $set: { 
          lastViewedAt: new Date(),
          status: 'viewed' 
        }
      },
      { new: true }
    );
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    // Notify the invoice owner (in-app)
    if (invoice.user) {
      await createNotification({
        user: invoice.user,
        type: 'invoice_viewed',
        message: `Invoice #${invoice.invoiceNumber} was viewed by the client`,
        data: { invoiceId: invoice._id }
      });
    }
    // Return a transparent 1x1 pixel
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
    console.error('Error tracking invoice view:', error);
    // Still return a pixel even if there's an error
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
};

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats
// @access  Private
const mongoose = require('mongoose');
exports.getInvoiceStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const stats = await Invoice.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0]
            }
          },
          totalOutstanding: {
            $sum: {
              $cond: [
                { $in: ['$status', ['sent', 'viewed', 'overdue']] },
                '$total',
                0
              ]
            }
          },
          statusCounts: {
            $push: {
              status: '$status',
              amount: '$total'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalInvoices: 1,
          totalRevenue: 1,
          totalPaid: 1,
          totalOutstanding: 1,
          byStatus: {
            $arrayToObject: {
              $map: {
                input: [
                  { k: 'draft', v: 0 },
                  { k: 'sent', v: 0 },
                  { k: 'viewed', v: 0 },
                  { k: 'paid', v: 0 },
                  { k: 'overdue', v: 0 },
                  { k: 'cancelled', v: 0 }
                ],
                as: 'status',
                in: {
                  k: '$$status.k',
                  v: {
                    $size: {
                      $filter: {
                        input: '$statusCounts',
                        as: 's',
                        cond: { $eq: ['$$s.status', '$$status.k'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: stats[0] || {
        totalInvoices: 0,
        totalRevenue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        byStatus: {
          draft: 0,
          sent: 0,
          viewed: 0,
          paid: 0,
          overdue: 0,
          cancelled: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting invoice stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice statistics',
      error: error.message
    });
  }
};

// @desc    Log a payment for an invoice
// @route   POST /api/invoices/:id/payments
// @access  Private
const { createNotification } = require('../utils/notificationUtil');

exports.logPayment = async (req, res) => {
  try {
    const { amount, tip = 0, note } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount is required and must be greater than 0.' });
    }
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    // Add payment log
    invoice.payments.push({ amount, tip, note });
    // Calculate total paid (amount + tip for all payments)
    const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.amount || 0) + (p.tip || 0), 0);
    // Update status
    if (totalPaid >= invoice.total) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
    } else if (totalPaid > 0) {
      invoice.status = 'paid-partially';
      invoice.paidAt = undefined;
    }
    await invoice.save();
    // Notify the invoice owner
    await createNotification({
      user: invoice.user,
      type: 'payment_logged',
      message: `Payment of ${amount} logged for Invoice #${invoice.invoiceNumber}`,
      data: { invoiceId: invoice._id, payment: { amount, tip, note } }
    });
    res.json({ success: true, message: 'Payment logged.', data: invoice });
  } catch (err) {
    console.error('Error logging payment:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};