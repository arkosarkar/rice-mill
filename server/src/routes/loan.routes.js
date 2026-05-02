const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loan.controller');

// Create new loan
router.post('/', loanController.createLoan);

// Pay EMI
router.post('/pay-emi', loanController.payEMI);

// Get upcoming EMIs
router.get('/upcoming', loanController.getUpcomingEMIs);

module.exports = router;
