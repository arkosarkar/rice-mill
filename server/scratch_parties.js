const sql = require('./src/config/db');
async function test() {
  try {
    const res = await sql`SELECT id, name, type FROM parties`;
    console.log('Parties in DB:', res);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
