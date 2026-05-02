const sql = require('../config/db');

/**
 * Helper to calculate average rate for a variety to valuate stock.
 */
async function getAveragePaddyRate(variety) {
  const result = await sql`
    SELECT AVG(rate_per_kg) as avg_rate 
    FROM paddy_inwards 
    WHERE paddy_variety = ${variety}
  `;
  return parseFloat(result[0].avg_rate) || 0;
}

/**
 * Get overall summary for the report dashboard cards.
 */
exports.getSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    
    // 1. Production Summary
    const prodStats = await sql`
      SELECT 
        SUM(paddy_input_kg) as total_input,
        SUM(premium_rice_kg + grade_a_rice_kg + grade_b_rice_kg) as total_output,
        AVG(yield_percent) as avg_yield
      FROM productions
      WHERE process_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'}
    `;

    // 2. Sales Summary
    const salesStats = await sql`
      SELECT 
        SUM(grand_total) as total_revenue,
        COUNT(*) as total_orders,
        SUM(quantity_kg) as total_sold_kg
      FROM sales
      WHERE invoice_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'}
    `;

    // 3. Stock Valuation
    const stocks = await sql`SELECT variety, SUM(available_weight_kg) as total_kg FROM rice_stocks GROUP BY variety`;
    let totalValuation = 0;
    for (const s of stocks) {
      const avgRate = await getAveragePaddyRate(s.variety);
      totalValuation += (parseFloat(s.total_kg) || 0) * (avgRate || 25); // Fallback to 25 if no purchase history
    }

    // 4. Outstanding Receivables
    const outstanding = await sql`SELECT SUM(balance_due) as total FROM sales WHERE balance_due > 0`;

    // 5. Top Customers by Revenue
    const topCustomers = await sql`
      SELECT customer_name, SUM(grand_total) as revenue 
      FROM sales 
      WHERE invoice_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'}
      GROUP BY customer_name 
      ORDER BY revenue DESC 
      LIMIT 3
    `;

    res.json({
      production: {
        totalInput: parseFloat(prodStats[0].total_input) || 0,
        totalOutput: parseFloat(prodStats[0].total_output) || 0,
        avgYield: parseFloat(prodStats[0].avg_yield) || 0
      },
      sales: {
        totalRevenue: parseFloat(salesStats[0].total_revenue) || 0,
        totalOrders: parseInt(salesStats[0].total_orders) || 0,
        totalSoldKg: parseFloat(salesStats[0].total_sold_kg) || 0,
        top3Customers: topCustomers
      },
      stockValuation: totalValuation,
      outstandingReceivables: parseFloat(outstanding[0].total) || 0
    });
  } catch (error) {
    console.error('Report Summary Error:', error);
    res.status(500).json({ message: 'Failed to generate report summary', error: error.message });
  }
};

/**
 * Customer Wise Sale Performance
 */
exports.getCustomerPerformance = async (req, res) => {
  try {
    const { fromDate, toDate, customerName } = req.query;
    const data = await sql`
      SELECT 
        customer_name as "customer",
        MAX(invoice_date) as "date",
        SUM(bags) as "bags",
        SUM(quantity_kg) as "weight",
        SUM(grand_total) as "total",
        SUM(balance_due) as "outstanding"
      FROM sales
      WHERE (invoice_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'})
      AND (${customerName || 'All Customers'} = 'All Customers' OR customer_name = ${customerName})
      GROUP BY customer_name
      ORDER BY total DESC
    `;
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load customer performance', error: error.message });
  }
};

/**
 * Detailed Production Report
 */
exports.getProductionReport = async (req, res) => {
  try {
    const { fromDate, toDate, variety } = req.query;
    const data = await sql`
      SELECT 
        process_date as "date",
        paddy_variety as "variety",
        paddy_input_kg as "input",
        (premium_rice_kg + grade_a_rice_kg + grade_b_rice_kg) as "output",
        broken_rice_kg as "broken",
        (bran_kg + husk_kg + other_waste_kg) as "waste",
        yield_percent as "yield"
      FROM productions
      WHERE (process_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'})
      AND (${variety || 'All Varieties'} = 'All Varieties' OR paddy_variety = ${variety})
      ORDER BY process_date DESC
    `;
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load production report', error: error.message });
  }
};

/**
 * Detailed Stock Valuation
 */
exports.getStockReport = async (req, res) => {
  try {
    const stocks = await sql`
      SELECT 
        item_type, variety, rice_type, godown, 
        SUM(available_weight_kg) as "weight",
        SUM(bags) as "bags"
      FROM rice_stocks
      GROUP BY item_type, variety, rice_type, godown
    `;
    
    const enriched = [];
    for (const s of stocks) {
      const avgRate = await getAveragePaddyRate(s.variety);
      enriched.push({
        ...s,
        avgRate,
        valuation: (parseFloat(s.weight) || 0) * (avgRate || 25)
      });
    }
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load stock report', error: error.message });
  }
};

/**
 * Financial P&L Report
 */
exports.getFinancialReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    
    const sales = await sql`SELECT SUM(grand_total) as revenue FROM sales WHERE invoice_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'}`;
    const purchases = await sql`SELECT SUM(total_amount) as cost FROM paddy_inwards WHERE entry_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'}`;
    const expenses = await sql`SELECT SUM(amount) as total FROM expenses WHERE expense_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'}`;
    
    // GST Data
    const outputGst = await sql`SELECT SUM(tax_amount) as total FROM sales WHERE invoice_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'}`;
    const inputGstResult = await sql`SELECT SUM(gst_amount) as total FROM paddy_inwards WHERE entry_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'}`;
    const inputGst = parseFloat(inputGstResult[0].total) || 0;

    res.json({
      revenue: parseFloat(sales[0].revenue) || 0,
      paddyCost: parseFloat(purchases[0].cost) || 0,
      operatingExpenses: parseFloat(expenses[0].total) || 0,
      grossProfit: (parseFloat(sales[0].revenue) || 0) - (parseFloat(purchases[0].cost) || 0),
      netProfit: (parseFloat(sales[0].revenue) || 0) - (parseFloat(purchases[0].cost) || 0) - (parseFloat(expenses[0].total) || 0),
      gst: {
        output: parseFloat(outputGst[0].total) || 0,
        input: inputGst,
        netPayable: (parseFloat(outputGst[0].total) || 0) - inputGst
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load financial report', error: error.message });
  }
};

/**
 * Detailed Sales Report
 */
exports.getSalesReport = async (req, res) => {
  try {
    const { fromDate, toDate, variety } = req.query;
    const data = await sql`
      SELECT 
        invoice_date as "date",
        invoice_no as "invoice",
        customer_name as "customer",
        variety,
        quantity_kg as "qty",
        grand_total as "total",
        payment_status as "status"
      FROM sales
      WHERE (invoice_date BETWEEN ${fromDate || '2000-01-01'} AND ${toDate || '2099-12-31'})
      AND (${variety || 'All Varieties'} = 'All Varieties' OR variety = ${variety})
      ORDER BY invoice_date DESC
    `;
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load sales report', error: error.message });
  }
};
