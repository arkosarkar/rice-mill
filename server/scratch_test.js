const sql = require('./src/config/db');

async function test() {
  try {
    const res = await sql`SELECT COALESCE(${0}, 0) as val`;
    console.log('Success:', res);
  } catch (err) {
    console.error('Postgres error:', err);
  } finally {
    process.exit(0);
  }
}
test();
