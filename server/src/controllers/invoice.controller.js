const Invoice = require('../models/Invoice');
const { calculateGST } = require('../utils/gstCalculator');
const { generateInvoiceNo, amountToWords } = require('../utils/invoiceGenerator');
const PDFDocument = require('pdfkit');

/**
 * Generate a new invoice.
 */
exports.generateInvoice = async (req, res) => {
  try {
    const { invoice_type, seller, buyer, items, notes } = req.body;

    // 1. Auto detect supply type
    const supply_type = seller.state_code === buyer.state_code ? 'INTRASTATE' : 'INTERSTATE';
    const is_igst = supply_type === 'INTERSTATE';

    // 2. Process items and calculate GST
    let subtotal = 0;
    let total_cgst = 0;
    let total_sgst = 0;
    let total_igst = 0;

    const processedItems = items.map(item => {
      const base_amount = item.qty * item.rate;
      const gstData = calculateGST(base_amount, item.gst_rate, is_igst);

      subtotal += base_amount;
      total_cgst += gstData.cgst;
      total_sgst += gstData.sgst;
      total_igst += gstData.igst;

      return {
        ...item,
        base_amount,
        cgst: gstData.cgst,
        sgst: gstData.sgst,
        igst: gstData.igst,
        line_total: gstData.total
      };
    });

    const grand_total = subtotal + total_cgst + total_sgst + total_igst;

    // 3. Generate invoice number
    const invoice_no = await generateInvoiceNo(invoice_type);

    // 4. Create invoice record
    const invoice = await Invoice.create({
      invoice_no,
      invoice_type,
      seller,
      buyer,
      supply_type,
      items: processedItems,
      subtotal,
      total_cgst,
      total_sgst,
      total_igst,
      grand_total,
      amount_in_words: amountToWords(grand_total),
      balance_due: grand_total, // Initial balance
      payment_status: 'UNPAID',
      notes
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get invoice details.
 */
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new Error('Invoice not found');
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate PDF for invoice.
 */
exports.generatePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new Error('Invoice not found');

    const doc = new PDFDocument({ margin: 50 });
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoice_no}.pdf`);
    
    doc.pipe(res);

    // Simple PDF template
    doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice No: ${invoice.invoice_no}`);
    doc.text(`Date: ${invoice.invoice_date.toLocaleDateString()}`);
    doc.moveDown();

    doc.text(`Seller: ${invoice.seller.name}`);
    doc.text(`GSTIN: ${invoice.seller.gstin}`);
    doc.moveDown();

    doc.text(`Buyer: ${invoice.buyer.name}`);
    doc.text(`GSTIN: ${invoice.buyer.gstin}`);
    doc.moveDown();

    // Table Header
    doc.text('---------------------------------------------------------');
    doc.text('Description | Qty | Rate | GST | Total');
    doc.text('---------------------------------------------------------');

    invoice.items.forEach(item => {
      doc.text(`${item.description} | ${item.qty} | ${item.rate} | ${item.gst_rate}% | ${item.line_total}`);
    });

    doc.text('---------------------------------------------------------');
    doc.moveDown();

    doc.text(`Subtotal: ${invoice.subtotal}`);
    doc.text(`GST: ${invoice.total_cgst + invoice.total_sgst + invoice.total_igst}`);
    doc.fontSize(14).text(`Grand Total: ${invoice.grand_total}`, { bold: true });
    doc.moveDown();

    doc.fontSize(10).text(`Amount in Words: ${invoice.amount_in_words}`);
    
    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
