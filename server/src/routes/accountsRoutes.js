const express = require('express');
const router = express.Router();
const accountsController = require('../controllers/accountsController');

router.post('/ledgers', accountsController.createLedger);
router.get('/ledgers', accountsController.listLedgers);
router.put('/ledgers/:id', accountsController.updateLedger);
router.post('/transactions', accountsController.createTransaction);
router.get('/transactions', accountsController.listTransactions);
router.get('/balance-sheet', accountsController.getBalanceSheet);
router.get('/pl-statement', accountsController.getPLStatement);

module.exports = router;
