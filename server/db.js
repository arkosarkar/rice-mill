const { Pool } = require('pg');
require('dotenv').config();

// Pool ka use multiple requests handle karne ke liye hota hai
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Neon Database se connect ho gaya, Bhaai!");
    client.release(); // Connection check karke release kar dena
  } catch (err) {
    console.error("❌ Neon Connection Error:", err.message);
  }
};

module.exports = { pool, connectDB };