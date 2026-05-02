const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function check() {
  try {
    const res = await sql`SELECT * FROM transactions WHERE ref_module = 'Paddy Inward'`;
    console.log(`Found ${res.length} transactions for Paddy Inward.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
