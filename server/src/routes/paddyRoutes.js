const express = require('express');
const router = express.Router();
const paddyController = require('../controllers/paddyController');

router.post('/', paddyController.createPaddyInward);
router.get('/stats', paddyController.getStats);
router.get('/', paddyController.getPaddyInwards);
router.put('/:id', paddyController.updatePaddyInward);
router.delete('/:id', paddyController.deletePaddyInward);
router.post('/payment', paddyController.processPayment);
router.post('/resync-balances', paddyController.resyncAllFarmerBalances);

module.exports = router;
