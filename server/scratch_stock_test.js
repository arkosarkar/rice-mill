const sql = require('./src/config/db');
const { updateStock } = require('./src/services/stockService');

async function test() {
  try {
    // Try creating the unique index
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS rice_stocks_agg_key ON rice_stocks (item_type, variety, rice_type, godown)`;
    console.log('✅ Unique index created/verified');

    // Test updateStock: ADD then REMOVE
    await updateStock(sql, 'paddy', 'PR 11', 'Raw Paddy', 'Test Godown', 10, 500, 'ADD');
    console.log('✅ ADD worked');
    
    await updateStock(sql, 'paddy', 'PR 11', 'Raw Paddy', 'Test Godown', 10, 500, 'REMOVE');
    console.log('✅ REMOVE worked');

    // Clean up test data
    await sql`DELETE FROM rice_stocks WHERE godown = 'Test Godown' AND source_ref = 'Aggregate'`;
    console.log('✅ Test data cleaned. All tests passed!');
  } catch(e) {
    if (e.message === 'ROLLBACK_TEST') {
      console.log('✅ All tests passed. Test data rolled back cleanly.');
    } else {
      console.error('❌ TEST FAILED:', e.message);
    }
  } finally {
    process.exit(0);
  }
}
test();
