const sql = require('./src/config/db');
async function test() {
  try {
    const indexes = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'rice_stocks'`;
    console.log('Indexes:', indexes.map(i => i.indexname));
    
    // Also check for duplicates that might prevent index creation
    const dups = await sql`
      SELECT item_type, variety, rice_type, godown, COUNT(*) 
      FROM rice_stocks 
      GROUP BY item_type, variety, rice_type, godown 
      HAVING COUNT(*) > 1
    `;
    console.log('Duplicates:', dups);
  } catch (err) {
    console.error('Check Fail:', err);
  } finally {
    process.exit(0);
  }
}
test();
