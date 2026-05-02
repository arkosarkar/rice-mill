const sql = require('./src/config/db');

async function checkDuplicates() {
  try {
    const dups = await sql`
      SELECT item_type, variety, rice_type, godown, COUNT(*) 
      FROM rice_stocks 
      GROUP BY item_type, variety, rice_type, godown 
      HAVING COUNT(*) > 1
    `;
    console.log('Duplicate attribute combinations:', dups);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDuplicates();
