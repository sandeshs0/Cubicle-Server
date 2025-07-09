const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  // Basic Info
  invoiceNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'], 
    default: 'draft' 
  },
  
  // Relationships
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project' 
  },
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Dates
  issueDate: { 
    type: Date, 
    default: Date.now 
  },
  dueDate: { 
    type: Date, 
    required: true 
  },
  paidAt: { 
    type: Date 
  },
  
  // Billing Details
  billingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  
  // Financials
  items: [InvoiceItemSchema],
  subtotal: { 
    type: Number, 
    required: true 
  },
  taxType: { 
    type: String, 
    enum: ['percentage', 'fixed', 'none'], 
    default: 'none' 
  },
  taxRate: { 
    type: Number, 
    default: 0 
  },
  taxAmount: { 
    type: Number, 
    default: 0 
  },
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed', 'none'], 
    default: 'none' 
  },
  discountValue: { 
    type: Number, 
    default: 0 
  },
  discountAmount: { 
    type: Number, 
    default: 0 
  },
  total: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  
  // Content
  notes: String,
  terms: String,
  paymentInstructions: String,
  htmlContent: { 
    type: String, 
    required: true 
  },
  templateData: { 
    type: mongoose.Schema.Types.Mixed 
  },
  
  // Tracking
  lastSentAt: Date,
  viewCount: { 
    type: Number, 
    default: 0 
  },
  lastViewedAt: Date,
  paymentLink: String,
  trackingId: {
    type: String,
    unique: true,
    sparse: true
  }
}, { 
  timestamps: true 
});

// Generate invoice number before saving
InvoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  
  // Generate tracking ID if not exists
  if (!this.trackingId) {
    this.trackingId = require('crypto').randomBytes(16).toString('hex');
  }
  
  next();
});

// Indexes for better query performance
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ client: 1 });
InvoiceSchema.index({ user: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ trackingId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
