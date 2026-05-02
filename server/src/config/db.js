const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000, // 10 seconds to connect
  idleTimeoutMillis: 30000,       // 30 seconds idle before close
});

/**
 * A bit of a "magic" helper that allows us to use standard pg pool 
 * with the tagged template literal syntax the codebase already uses.
 */
async function sql(strings, ...params) {
  let query;
  let values;

  if (Array.isArray(strings)) {
    // Tagged template literal usage: sql`SELECT ...`
    query = strings.reduce((acc, str, i) => acc + str + (i < params.length ? `$${i + 1}` : ''), '');
    values = params;
  } else {
    // Direct function call usage: sql("SELECT ...", ...params)
    query = strings;
    values = params;
  }

  try {
    const res = await pool.query(query, values);
    return res.rows;
  } catch (err) {
    console.error('❌ Database Query Error:', {
      query,
      values,
      message: err.message || err,
      code: err.code,
      stack: err.stack?.split('\n')[1]?.trim()
    });
    throw err;
  }
}

/**
 * Transaction helper: sql.begin(async sql => { ... })
 */
sql.begin = async function(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create a localized sql helper for this client
    const txSql = async (strings, ...params) => {
      let query;
      let values;
      if (Array.isArray(strings)) {
        query = strings.reduce((acc, str, i) => acc + str + (i < params.length ? `$${i + 1}` : ''), '');
        values = params;
      } else {
        query = strings;
        values = params;
      }
      const res = await client.query(query, values);
      return res.rows;
    };

    const result = await callback(txSql);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = sql;
module.exports.pool = pool;
