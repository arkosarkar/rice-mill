const express = require('express');
const router = express.Router();
const gstController = require('../controllers/gst.controller');

// Get monthly GST report
router.get('/:year/:month', gstController.getMonthlyGSTReport);

module.exports = router;
