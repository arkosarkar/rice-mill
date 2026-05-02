const Backorder = require('../models/Backorder');
const RiceStock = require('../models/RiceStock');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const { calculateGST } = require('../utils/gstCalculator');
const { generateInvoiceNo, amountToWords, getFinancialYear } = require('../utils/invoiceGenerator');
const mongoose = require('mongoose');
const dayjs = require('dayjs');

/**
 * Create a new backorder.
 */
exports.createBackorder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customer, items, advance_received, notes } = req.body;

    // 1. Calculate total order value
    let totalOrderValue = 0;
    const boItems = items.map(item => {
      const lineTotal = item.qty * item.rate_per_unit;
      totalOrderValue += lineTotal;
      return {
        ...item,
        fulfilled_qty: 0,
        pending_qty: item.qty
      };
    });

    // 2. Create Backorder
    const backorder = await Backorder.create([{
      order_date: new Date(),
      customer,
      items: boItems,
      total_order_value: totalOrderValue,
      advance_received: advance_received || 0,
      status: 'PENDING',
      notes
    }], { session });

    const boRecord = backorder[0];

    // 3. Create ADVANCE_IN transaction if advance received
    if (advance_received > 0) {
      const txnDate = dayjs();
      const advanceTxn = await Transaction.create([{
        date: txnDate.toDate(),
        month: txnDate.format('YYYY-MM'),
        financial_year: getFinancialYear(txnDate.toDate()),
        type: 'ADVANCE_IN',
        category: 'BACKORDER_ADVANCE',
        party: {
          name: customer.name,
          type: 'CUSTOMER',
          gstin: customer.gstin
        },
        amount: {
          base_amount: advance_received,
          gst_applied: false,
          gst_rate: 0,
          gst_amount: 0,
          total_amount: advance_received
        },
        payment_mode: 'BANK', // Default to bank for advance?
        is_paid: true,
        backorder_ref: boRecord._id,
        notes: `Advance for Backorder ${boRecord.order_id}`
      }], { session });

      boRecord.advance_txn_ref = advanceTxn[0]._id;
      await boRecord.save({ session });
    }

    // 4. Generate Proforma Invoice No
    boRecord.proforma_invoice_no = await generateInvoiceNo('PROFORMA');
    await boRecord.save({ session });

    await session.commitTransaction();
    res.status(201).json({ success: true, data: boRecord });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Fulfill/Deliver a backorder.
 */
exports.fulfillBackorder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { qty_to_deliver, item_index, rate, payment_mode, is_paid } = req.body;

    const bo = await Backorder.findById(id).session(session);
    if (!bo) throw new Error('Backorder not found');

    const item = bo.items[item_index];
    if (!item || item.pending_qty < qty_to_deliver) {
      throw new Error('Invalid item or quantity to deliver');
    }

    // 1. Check stock availability (Assuming we check RiceStock model)
    const stock = await RiceStock.findOne({
      variety: item.variety || bo.paddyVariety, // fallback
      type: 'finished_rice',
      availableWeightKg: { $gte: qty_to_deliver }
    }).session(session);

    // If no stock model provided in user request, we skip this or use dummy
    // But as a senior dev, I'll implement the deduction logic
    if (stock) {
      stock.availableWeightKg -= qty_to_deliver;
      await stock.save({ session });
    }

    // 2. Calculate GST on delivery
    const gstData = calculateGST(qty_to_deliver * rate, item.gst_rate, false);

    // 3. Generate Tax Invoice
    const invoiceNo = await generateInvoiceNo('TAX_INVOICE');
    
    // Adjust advance if any (Pro-rata or full?)
    // For simplicity, let's say we adjust available advance up to this invoice total
    const advanceToAdjust = Math.min(bo.advance_received, gstData.total);
    const balanceDue = gstData.total - advanceToAdjust;

    const invoice = await Invoice.create([{
      invoice_no: invoiceNo,
      invoice_date: new Date(),
      invoice_type: 'TAX_INVOICE',
      seller: { name: 'Rice Mill Name' },
      buyer: {
        name: bo.customer.name,
        address: bo.customer.address,
        gstin: bo.customer.gstin,
        state: bo.customer.state
      },
      supply_type: 'INTRASTATE',
      items: [{
        description: `${item.product_type} Sale (Backorder Fulfillment)`,
        qty: qty_to_deliver,
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
      advance_adjusted: advanceToAdjust,
      balance_due: balanceDue,
      payment_mode: payment_mode || 'CASH',
      payment_status: is_paid ? 'PAID' : (advanceToAdjust > 0 ? 'PARTIAL' : 'UNPAID'),
      backorder_ref: bo._id
    }], { session });

    // 4. Create INCOME transaction
    const txnDate = dayjs();
    const saleTxn = await Transaction.create([{
      date: txnDate.toDate(),
      month: txnDate.format('YYYY-MM'),
      financial_year: getFinancialYear(txnDate.toDate()),
      type: 'INCOME',
      category: 'RICE_SALE',
      party: {
        name: bo.customer.name,
        type: 'CUSTOMER',
        gstin: bo.customer.gstin
      },
      amount: {
        base_amount: gstData.base_amount,
        gst_applied: true,
        gst_rate: item.gst_rate,
        gst_amount: gstData.gst_amount,
        total_amount: gstData.total
      },
      gst: {
        cgst: gstData.cgst,
        sgst: gstData.sgst,
        igst: gstData.igst,
        is_igst: false
      },
      payment_mode: payment_mode || 'CASH',
      is_paid: is_paid || false,
      invoice_ref: invoice[0]._id,
      backorder_ref: bo._id,
      notes: `Fulfillment of BO ${bo.order_id}`
    }], { session });

    // 5. Update Backorder
    item.fulfilled_qty += qty_to_deliver;
    item.pending_qty -= qty_to_deliver;
    bo.advance_received -= advanceToAdjust;
    
    bo.deliveries.push({
      date: new Date(),
      qty: qty_to_deliver,
      invoice_id: invoice[0]._id,
      amount: gstData.total
    });

    // Update status
    const allFulfilled = bo.items.every(i => i.pending_qty === 0);
    bo.status = allFulfilled ? 'FULFILLED' : 'PARTIAL';
    await bo.save({ session });

    await session.commitTransaction();
    res.json({ success: true, data: { bo, invoice: invoice[0] } });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get all pending backorders.
 */
exports.getPendingBackorders = async (req, res) => {
  try {
    const backorders = await Backorder.find({
      status: { $in: ['PENDING', 'CONFIRMED', 'PARTIAL'] }
    }).sort({ order_date: 1 });
    res.json({ success: true, data: backorders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get fulfillable backorders based on current stock.
 */
exports.getFulfillableBackorders = async (req, res) => {
  try {
    // 1. Get all pending backorders
    const pending = await Backorder.find({
      status: { $in: ['PENDING', 'CONFIRMED', 'PARTIAL'] }
    }).sort({ order_date: 1 });

    // 2. Get current finished rice stock
    const stocks = await RiceStock.find({ type: 'finished_rice' });
    
    const fulfillable = [];

    // Simple matching logic
    pending.forEach(bo => {
      bo.items.forEach(item => {
        if (item.pending_qty > 0) {
          const matchingStock = stocks.find(s => s.variety === item.variety && s.availableWeightKg > 0);
          if (matchingStock) {
            fulfillable.push({
              backorder: bo,
              item,
              available_stock: matchingStock.availableWeightKg
            });
          }
        }
      });
    });

    res.json({ success: true, data: fulfillable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
