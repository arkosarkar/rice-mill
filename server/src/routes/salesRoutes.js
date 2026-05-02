const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.post('/', salesController.createSale);
router.get('/', salesController.listSales);
router.get('/report/csv', salesController.downloadCSV);
router.put('/:id', salesController.updateSale);
router.post('/payment', salesController.processPayment);
router.get('/:id/invoice', salesController.getInvoiceJSON);
router.delete('/:id', salesController.deleteSale);
module.exports = router;
