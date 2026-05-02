const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

router.get('/summary', reportsController.getSummary);
router.get('/production', reportsController.getProductionReport);
router.get('/stock', reportsController.getStockReport);
router.get('/financial', reportsController.getFinancialReport);
router.get('/sales', reportsController.getSalesReport);
router.get('/customer-performance', reportsController.getCustomerPerformance);

module.exports = router;
