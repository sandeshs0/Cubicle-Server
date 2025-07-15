const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const  auth  = require('../middleware/auth');

router.get('/stats', auth, invoiceController.getInvoiceStats);

// Invoice routes
router
  .route('/')
  .post(auth, invoiceController.createInvoice)
  .get(auth, invoiceController.getInvoices);

router
  .route('/:id')
  .get(auth, invoiceController.getInvoice)
  .put(auth, invoiceController.updateInvoice)
  .delete(auth, invoiceController.deleteInvoice);


// Add new payment logging route
router.post('/:id/payments', auth, invoiceController.logPayment);

// Invoice statistics

// Send invoice via email
router.post('/:id/send', auth, invoiceController.sendInvoice);

// Track invoice view (public endpoint)
router.get('/track/:trackingId', invoiceController.trackInvoiceView);

module.exports = router;
