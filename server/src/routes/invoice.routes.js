const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');

// Generate new invoice
router.post('/', invoiceController.generateInvoice);

// Get invoice details
router.get('/:id', invoiceController.getInvoice);

// Generate PDF for invoice
router.get('/:id/pdf', invoiceController.generatePDF);

module.exports = router;
