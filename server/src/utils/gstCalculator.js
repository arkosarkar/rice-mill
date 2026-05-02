/**
 * Calculates GST components for a given base amount and rate.
 * @param {number} base_amount - The taxable amount.
 * @param {number} gst_rate - The GST percentage (0, 5, 12, 18).
 * @param {boolean} is_igst - Whether it's an interstate transaction.
 * @returns {object} - Calculated GST components and total.
 */
function calculateGST(base_amount, gst_rate, is_igst = false) {
  const gst_amount = (base_amount * gst_rate) / 100;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (is_igst) {
    igst = gst_amount;
  } else {
    cgst = gst_amount / 2;
    sgst = gst_amount / 2;
  }

  return {
    base_amount,
    gst_rate,
    gst_amount,
    cgst,
    sgst,
    igst,
    total: base_amount + gst_amount
  };
}

module.exports = { calculateGST };
