const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');

router.post('/', productionController.createProduction);
router.get('/', productionController.listProduction);
router.put('/:id', productionController.updateProduction);
router.delete('/:id', productionController.deleteProduction);

module.exports = router;
