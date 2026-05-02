const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');

router.post('/credit-note', notesController.createCreditNote);
router.post('/debit-note', notesController.createDebitNote);
router.get('/', notesController.listNotes);

module.exports = router;
