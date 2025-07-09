const express = require('express');
const router = express.Router();
const  auth  = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

// Apply auth middleware to all routes except tracking
router.use((req, res, next) => {
  // Skip auth for tracking endpoint
  if (req.path.startsWith('/track/')) {
    return next();
  }
  return auth(req, res, next);
});

// Invoice routes
router
  .route('/')
  .post(invoiceController.createInvoice)
  .get(invoiceController.getInvoices);

router
  .route('/:id')
  .get(invoiceController.getInvoice)
  .put(invoiceController.updateInvoice)
  .delete(invoiceController.deleteInvoice);

// Send invoice via email
router.post('/:id/send', invoiceController.sendInvoice);

// Track invoice view (public endpoint)
router.get('/track/:trackingId', invoiceController.trackInvoiceView);

// Get invoice statistics
router.get('/stats', invoiceController.getInvoiceStats);

module.exports = router;
