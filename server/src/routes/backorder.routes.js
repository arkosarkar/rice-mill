const express = require('express');
const router = express.Router();
const backorderController = require('../controllers/backorder.controller');

// Create new backorder
router.post('/', backorderController.createBackorder);

// Fulfill a backorder
router.post('/:id/fulfill', backorderController.fulfillBackorder);

// Get all pending backorders
router.get('/pending', backorderController.getPendingBackorders);

// Get fulfillable backorders
router.get('/fulfillable', backorderController.getFulfillableBackorders);

module.exports = router;
