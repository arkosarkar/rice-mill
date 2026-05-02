const express = require('express');
const router = express.Router();
const plController = require('../controllers/pl.controller');

// Get monthly P&L
router.get('/:year/:month', plController.getMonthlyPL);

module.exports = router;
