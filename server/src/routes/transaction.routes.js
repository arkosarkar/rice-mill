const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');

// Add a new transaction
router.post('/', transactionController.addTransaction);

// Get daily cash flow
router.get('/daily/:date', transactionController.getDailyCashFlow);

// Get monthly cash flow
router.get('/monthly/:year/:month', transactionController.getMonthlyCashFlow);

module.exports = router;
