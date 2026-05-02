const Backorder = require('../models/Backorder');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const { calculateGST } = require('./gstCalculator');
const { generateInvoiceNo, amountToWords } = require('./invoiceGenerator');
const mongoose = require('mongoose');

/**
 * Checks the backorder queue for a product and returns fulfillable orders.
 * Uses FIFO (First In First Out) logic.
 * @param {string} product_type - Type of product (RICE, BRAN, etc.)
 * @param {number} available_qty - Current available stock quantity.
 * @returns {Promise<Array>} - List of backorders that can be partially/fully fulfilled.
 */
async function checkBackorderQueue(product_type, available_qty) {
  const backorders = await Backorder.find({
    'items.product_type': product_type,
    status: { $in: ['PENDING', 'CONFIRMED', 'PARTIAL'] }
  }).sort({ order_date: 1 });

  const fulfillable = [];
  let remaining_stock = available_qty;

  for (const bo of backorders) {
    if (remaining_stock <= 0) break;

    const item = bo.items.find(i => i.product_type === product_type && i.pending_qty > 0);
    if (item) {
      const fulfill_qty = Math.min(item.pending_qty, remaining_stock);
      fulfillable.push({
        backorder_id: bo._id,
        order_id: bo.order_id,
        customer: bo.customer,
        item: {
          ...item.toObject(),
          fulfill_qty
        }
      });
      remaining_stock -= fulfill_qty;
    }
  }

  return fulfillable;
}

/**
 * Fulfills a specific backorder quantity.
 * @param {string} backorder_id - ID of the backorder.
 * @param {number} qty - Quantity to fulfill.
 * @param {number} rate - Rate per unit.
 * @returns {Promise<object>} - Result of fulfillment.
 */
async function fulfillBackorder(backorder_id, qty, rate) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bo = await Backorder.findById(backorder_id).session(session);
    if (!bo) throw new Error('Backorder not found');

    const item = bo.items.find(i => i.pending_qty >= qty);
    if (!item) throw new Error('Insufficient pending quantity in backorder');

    // 1. Calculate GST and Total
    const gstData = calculateGST(qty * rate, item.gst_rate, false); // Defaulting to intra-state

    // 2. Generate Invoice
    const invoiceNo = await generateInvoiceNo('TAX_INVOICE');
    const invoice = await Invoice.create([{
      invoice_no: invoiceNo,
      invoice_type: 'TAX_INVOICE',
      seller: { name: 'Rice Mill Name' }, // Should be config/env based
      buyer: {
        name: bo.customer.name,
        address: bo.customer.address,
        gstin: bo.customer.gstin,
        state: bo.customer.state
      },
      supply_type: 'INTRASTATE',
      items: [{
        description: `${item.product_type} Sale (Backorder Fulfillment)`,
        qty: qty,
        unit: item.unit,
        rate: rate,
        base_amount: gstData.base_amount,
        gst_rate: item.gst_rate,
        cgst: gstData.cgst,
        sgst: gstData.sgst,
        line_total: gstData.total
      }],
      subtotal: gstData.base_amount,
      grand_total: gstData.total,
      amount_in_words: amountToWords(gstData.total),
      balance_due: gstData.total,
      payment_status: 'UNPAID',
      backorder_ref: bo._id
    }], { session });

    // 3. Update Backorder
    item.fulfilled_qty += qty;
    item.pending_qty -= qty;
    bo.deliveries.push({
      date: new Date(),
      qty: qty,
      invoice_id: invoice[0]._id,
      amount: gstData.total
    });

    // Update status
    const allFulfilled = bo.items.every(i => i.pending_qty === 0);
    bo.status = allFulfilled ? 'FULFILLED' : 'PARTIAL';
    await bo.save({ session });

    await session.commitTransaction();
    return { success: true, invoice: invoice[0] };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = {
  checkBackorderQueue,
  fulfillBackorder
};
