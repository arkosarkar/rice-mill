const sql = require('./src/config/db');

async function check() {
  try {
    const r = await sql`SELECT * FROM rice_stocks WHERE item_type = 'paddy'`;
    console.log('paddy_stocks:', r);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
