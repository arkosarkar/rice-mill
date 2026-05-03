const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function check() {
  try {
    const res = await sql`SELECT username, role, status FROM users`;
    console.log('ALL USERS:');
    console.table(res);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
