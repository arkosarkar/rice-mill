const sql = require('./src/config/db');
async function check() {
  try {
    const paddy = await sql`SELECT COUNT(*) FROM paddy_inwards`;
    const clean = await sql`SELECT COUNT(*) FROM cleaning_batches`;
    const prod = await sql`SELECT COUNT(*) FROM productions`;
    const sales = await sql`SELECT COUNT(*) FROM sales`;
    const exp = await sql`SELECT COUNT(*) FROM expenses`;
    const tx = await sql`SELECT COUNT(*) FROM transactions`;
    const ld = await sql`SELECT COUNT(*) FROM ledgers`;

    console.log('--- Table Counts ---');
    console.log('Paddy Inwards:', paddy[0].count);
    console.log('Cleaning Batches:', clean[0].count);
    console.log('Productions:', prod[0].count);
    console.log('Sales:', sales[0].count);
    console.log('Expenses:', exp[0].count);
    console.log('Transactions:', tx[0].count);
    console.log('Ledgers:', ld[0].count);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
