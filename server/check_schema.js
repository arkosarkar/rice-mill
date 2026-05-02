const sql = require('./src/config/db');

async function checkSchema() {
  try {
    const columns = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rice_stocks'`;
    console.log('Rice Stocks Columns:', columns);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
