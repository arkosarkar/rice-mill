const sql = require('../src/config/db');

async function testFilter() {
    try {
        console.log('Testing Ready-for-Milling Filtered Query...');
        const batches = await sql`
      SELECT 
        cb.id,
        cb.inward_ref,
        cb.clean_output_kg,
        COALESCE(p.used_kg, 0) as used_kg,
        (cb.clean_output_kg - COALESCE(p.used_kg, 0)) as available_kg
      FROM cleaning_batches cb
      LEFT JOIN (
        SELECT 
          cleaning_batch_ref, 
          SUM(paddy_input_kg) as used_kg
        FROM productions
        GROUP BY cleaning_batch_ref
      ) p ON (
        TRIM(p.cleaning_batch_ref) = TRIM(cb.id::text) OR 
        TRIM(p.cleaning_batch_ref) = TRIM(cb.inward_ref)
      )
      WHERE cb.ready_for_milling = 'Yes - Send to Production'
      ORDER BY cb.created_at DESC
    `;
        
        console.log('Results:');
        batches.forEach(b => {
            console.log(`ID: ${b.id}, Inward: ${b.inward_ref}, Output: ${b.clean_output_kg}, Used: ${b.used_kg}, Available: ${b.available_kg}, Show in Dropdown: ${b.available_kg > 0 ? 'YES' : 'NO'}`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testFilter();
