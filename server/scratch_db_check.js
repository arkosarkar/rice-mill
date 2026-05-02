require('dotenv').config();
const sql = require('./db');

async function test() {
  try {
    const res = await sql`SELECT COUNT(*) FROM paddy_inwards`;
    console.log('Paddy Inwards Count:', res[0].count);
    const parties = await sql`SELECT COUNT(*) FROM parties`;
    console.log('Parties Count:', parties[0].count);
    process.exit(0);
  } catch (err) {
    console.error('DB Error:', err);
    process.exit(1);
  }
}
test();
