const bcrypt = require('bcryptjs');
const sql = require('./src/config/db');

async function testLogin() {
  const username = 'arkosarkarishere2004@gmail.com';
  const password = 'arko1234';

  try {
    const result = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = result[0];

    if (!user) {
      console.log('User not found in DB');
      return;
    }

    console.log('User found:', user.username);
    console.log('Hash from DB:', user.password_hash);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Bcrypt compare result:', isMatch);

    if (!isMatch) {
      // Let's manually compare with a fresh hash to see if the hash in DB is weird
      const freshHash = await bcrypt.hash(password, 10);
      console.log('Fresh hash for arko1234:', freshHash);
      const isFreshMatch = await bcrypt.compare(password, freshHash);
      console.log('Bcrypt compare with fresh hash:', isFreshMatch);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

testLogin();
