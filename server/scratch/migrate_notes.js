const sql = require('../src/config/db');

async function migrate() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        note_no VARCHAR(50) UNIQUE NOT NULL,
        note_type VARCHAR(20) NOT NULL CHECK (note_type IN ('Credit Note', 'Debit Note')),
        note_date DATE NOT NULL,
        ref_invoice_no VARCHAR(50) NOT NULL,
        party_name VARCHAR(255) NOT NULL,
        product_id INTEGER,
        product_name VARCHAR(255),
        quantity_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
        rate_per_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
        taxable_value NUMERIC(15,2) NOT NULL DEFAULT 0,
        cgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        sgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        igst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Notes table created');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

migrate();
