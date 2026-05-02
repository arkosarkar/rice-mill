const Invoice = require('../models/Invoice');
const dayjs = require('dayjs');

/**
 * Generates a sequential invoice number for the current financial year.
 * Format: PREFIX-YYYY-NNNNN
 * @param {string} type - Invoice type to determine prefix.
 * @returns {Promise<string>} - Generated invoice number.
 */
async function generateInvoiceNo(type) {
  let prefix = 'INV';
  if (type === 'PROFORMA') prefix = 'PRO';
  else if (type === 'CREDIT_NOTE') prefix = 'CRN';
  else if (type === 'DEBIT_NOTE') prefix = 'DBN';

  const now = dayjs();
  const year = now.year();
  
  // Count existing invoices for this type in current year
  const startOfYear = dayjs(`${year}-01-01`).toDate();
  const endOfYear = dayjs(`${year}-12-31`).toDate();

  const count = await Invoice.countDocuments({
    invoice_type: type,
    invoice_date: { $gte: startOfYear, $lte: endOfYear }
  });

  return `${prefix}-${year}-${(count + 1).toString().padStart(5, '0')}`;
}

/**
 * Converts a numeric amount to Indian currency format words.
 * @param {number} amount - The amount to convert.
 * @returns {string} - Amount in words.
 */
function amountToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertGroup(n % 100);
  }

  if (amount === 0) return 'Zero Rupees Only';

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let res = '';
  if (rupees >= 10000000) {
    res += convertGroup(Math.floor(rupees / 10000000)) + 'Crore ';
    rupees %= 10000000;
  }
  if (rupees >= 100000) {
    res += convertGroup(Math.floor(rupees / 100000)) + 'Lakh ';
    rupees %= 100000;
  }
  if (rupees >= 1000) {
    res += convertGroup(Math.floor(rupees / 1000)) + 'Thousand ';
    rupees %= 1000;
  }
  res += convertGroup(rupees);

  res = res.trim() + ' Rupees';
  if (paise > 0) {
    res += ' and ' + convertGroup(paise) + 'Paise';
  }
  return res + ' Only';
}

/**
 * Gets the financial year string for a given date.
 * @param {Date} date - The date to check.
 * @returns {string} - Financial year string (e.g., '2024-25').
 */
function getFinancialYear(date) {
  const d = dayjs(date);
  const year = d.year();
  const month = d.month(); // 0-indexed

  if (month >= 3) { // April is month index 3
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

module.exports = {
  generateInvoiceNo,
  amountToWords,
  getFinancialYear
};
