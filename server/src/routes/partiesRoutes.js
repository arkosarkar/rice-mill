const express = require('express');
const router = express.Router();
const partiesController = require('../controllers/partiesController');

router.get('/', partiesController.getParties);
router.post('/', partiesController.createParty);
router.put('/:id', partiesController.updateParty);
router.delete('/:id', partiesController.deleteParty);

router.get('/migrate/preview', partiesController.getMigrationPreview);
router.post('/migrate/bulk-import', partiesController.bulkImportParties);

module.exports = router;
