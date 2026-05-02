const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function fix() {
  try {
    console.log('Cleaning up duplicates...');
    
    // Delete duplicate rows keeping only the one with the highest ID
    await sql`
      DELETE FROM rice_stocks a
      USING rice_stocks b
      WHERE a.id < b.id
        AND a.item_type = b.item_type
        AND a.variety = b.variety
        AND a.rice_type = b.rice_type
        AND a.godown = b.godown
        AND a.is_recleaning = b.is_recleaning
        AND a.source_ref = b.source_ref
    `;

    console.log('Adding unique constraint...');
    await sql`ALTER TABLE rice_stocks DROP CONSTRAINT IF EXISTS rice_stocks_unique_idx`;
    await sql`ALTER TABLE rice_stocks ADD CONSTRAINT rice_stocks_unique_idx UNIQUE (item_type, variety, rice_type, godown, is_recleaning, source_ref)`;
    
    console.log('Constraint added successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Fix failed:', error);
    process.exit(1);
  }
}

fix();
