const bcrypt = require('bcryptjs');
const sql = require('./src/config/db');

async function fixPassword() {
  try {
    const hashedPassword = await bcrypt.hash('arko1234', 10);
    await sql`UPDATE users SET password_hash = ${hashedPassword} WHERE username = 'arkosarkarishere2004@gmail.com'`;
    console.log('Password successfully reset in the database to arko1234');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
fixPassword();
