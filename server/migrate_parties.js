const sql = require('./src/config/db');

async function migrate() {
  try {
    console.log('Starting Parties Table Migration...');

    // 1. Add missing columns safely
    await sql`
      ALTER TABLE parties 
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS shipping_address TEXT,
      ADD COLUMN IF NOT EXISTS credit_limit DECIMAL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS opening_balance_date DATE
    `;
    console.log('✅ Added missing columns to parties table.');

    // 2. Add email handling missing columns safely to ledgers too if tracking email.
    await sql`
      ALTER TABLE ledgers 
      ADD COLUMN IF NOT EXISTS email TEXT
    `;
    console.log('✅ Added missing columns to ledgers table.');

    // 3. Clean up duplicates to prepare for UNIQUE constraint
    console.log('🧹 Cleaning up duplicate mobile numbers (if any)...');
    const duplicates = await sql`
      SELECT mobile_number, array_agg(id) as ids, count(id) as cnt
      FROM parties
      WHERE mobile_number IS NOT NULL AND mobile_number != ''
      GROUP BY mobile_number
      HAVING count(id) > 1
    `;

    for (let current of duplicates) {
      // Keep the first one, modify the rest by appending '-dup' + random digits
      const idsToModify = current.ids.slice(1);
      for (let i = 0; i < idsToModify.length; i++) {
        const id = idsToModify[i];
        const newMobile = `${current.mobile_number}-dup${Math.floor(Math.random() * 900) + 100}`;
        await sql`UPDATE parties SET mobile_number = ${newMobile} WHERE id = ${id}`;
        console.log(`Updated duplicate mobile for Party ID ${id} to ${newMobile}`);
      }
    }

    // 4. Force mobile number to not be null implicitly if we want it unique? (Nulls don't trigger unique constraint in Postgres)
    // Actually, Postgres allows multiple NULL values even with UNIQUE constraints. 
    // We should make sure empty strings are converted to NULL so uniqueness works correctly.
    await sql`UPDATE parties SET mobile_number = NULL WHERE mobile_number = ''`;
    console.log('✅ Converted empty mobile numbers to Postgres NULL.');

    // 5. Apply the UNIQUE constraint on mobile_number
    console.log('🔒 Applying UNIQUE constraint to parties.mobile_number...');
    // We drop it first in case we changed its type or want to be safe, but if it doesn't exist drop will fail, so we catch error or check.
    try { 
        await sql`ALTER TABLE parties ADD CONSTRAINT parties_mobile_unique UNIQUE (mobile_number)`; 
        console.log('✅ Applied UNIQUE constraint successfully!');
    } catch(err) {
        if(err.message.includes("already exists")) {
            console.log('✅ UNIQUE constraint already exists.');
        } else {
            throw err;
        }
    }

    console.log('🎉 Migration fully completed successfully.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
}

migrate();
