const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function check() {
  try {
    const res = await sql`SELECT * FROM transactions WHERE ref_module = 'CLEANING'`;
    console.log(`Found ${res.length} transactions for Cleaning.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
