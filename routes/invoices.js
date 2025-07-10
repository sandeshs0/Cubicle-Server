const express = require('express');
const router = express.Router();
const  auth  = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');


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

// Send invoice via email
router.post('/:id/send', auth, invoiceController.sendInvoice);

// Track invoice view (public endpoint)
router.get('/track/:trackingId', invoiceController.trackInvoiceView);

// Get invoice statistics
router.get('/stats',auth, invoiceController.getInvoiceStats);

module.exports = router;
