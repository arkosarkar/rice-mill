const { neon } = require('@neondatabase/serverless');
require('dotenv').config();
const sql = neon(process.env.DATABASE_URL);

async function testCTE() {
  try {
    const entryDate = '2026-04-16';
    const entryTime = '12:00';
    const inwardNo = 'TEST-INW-' + Date.now();
    const supplierName = 'Test Supplier';
    
    console.log('Running CTE test...');
    const result = await sql`
      WITH inserted_paddy AS (
        INSERT INTO paddy_inwards (
          entry_date, entry_time, inward_no, supplier_name, gross_weight_kg, tare_weight_kg, net_weight_kg, paddy_variety, godown
        ) VALUES (
          ${entryDate}, ${entryTime}, ${inwardNo}, ${supplierName}, 100, 10, 90, 'PR 11', 'Main Godown'
        ) RETURNING *
      ),
      purchase_ledger AS (
        INSERT INTO ledgers (name, group_name) 
        VALUES ('Purchase Account', 'Purchases') 
        ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name 
        RETURNING id
      )
      SELECT * FROM inserted_paddy;
    `;
    
    console.log('Result length:', result.length);
    console.log('Result[0]:', JSON.stringify(result[0], null, 2));
    
    if (result && result[0]) {
        console.log('Mapping test successful');
        // Clean up
        await sql`DELETE FROM paddy_inwards WHERE inward_no = ${inwardNo}`;
    } else {
        console.log('Result is empty or not an array');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('CTE Error:', err);
    process.exit(1);
  }
}

testCTE();
