const sql = require('./src/config/db');

async function check() {
  try {
    const p = await sql`SELECT * FROM paddy_inwards WHERE available_weight_kg > 0`;
    console.log('paddy_inwards > 0:', p);
    const r = await sql`SELECT * FROM rice_stocks WHERE item_type = 'paddy' AND is_recleaning = true AND available_weight_kg > 0`;
    console.log('reclean_stocks > 0:', r);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
