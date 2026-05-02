const sql = require('./src/config/db');
async function test() {
  try {
    const db = await sql`SELECT current_database()`;
    console.log('Current DB:', db);
    const users = await sql`SELECT username, length(username) FROM users`;
    console.log('Users:', users);
  } catch (err) {
    console.error('Test Fail:', err);
  } finally {
    process.exit(0);
  }
}
test();
