const sql = require('./src/config/db');
async function check() {
  try {
    const users = await sql`SELECT id, username FROM users`;
    console.log(users);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
