const sql = require('../src/config/db');

async function migrate() {
  console.log('Starting migration of suppliers and customers to Parties Master...');
  
  try {
    // 1. Get unique names from Paddy Inwards
    const farmers = await sql`
      SELECT DISTINCT supplier_name as name, contact_number as mobile_number, village as address 
      FROM paddy_inwards 
      WHERE supplier_name IS NOT NULL AND supplier_name != ''
    `;
    
    // 2. Get unique names from Sales
    const customers = await sql`
      SELECT DISTINCT customer_name as name, contact_number as mobile_number, address 
      FROM sales
      WHERE customer_name IS NOT NULL AND customer_name != ''
    `;
    
    const all = [...farmers.map(f => ({...f, type: 'Farmer'})), ...customers.map(c => ({...c, type: 'Customer'}))];
    
    let count = 0;
    for (const p of all) {
      // Check if party exists
      const exists = await sql`SELECT id FROM parties WHERE name = ${p.name}`;
      if (exists.length === 0) {
        // Ensure Ledger exists
        const group_name = (p.type === 'Farmer') ? 'Creditors' : 'Debtors';
        await sql`INSERT INTO ledgers (name, group_name, mobile, address) VALUES (${p.name}, ${group_name}, ${p.mobile_number || ''}, ${p.address || ''}) ON CONFLICT (name) DO NOTHING`;
        
        // Create Party
        const newParty = await sql`
          INSERT INTO parties (name, type, mobile_number, address, ledger_id)
          VALUES (${p.name}, ${p.type}, ${p.mobile_number || ''}, ${p.address || ''}, (SELECT id FROM ledgers WHERE name = ${p.name}))
          RETURNING id
        `;
        
        // Link Ledger back
        if (newParty.length > 0) {
          await sql`UPDATE ledgers SET linked_party_id = ${newParty[0].id} WHERE name = ${p.name}`;
          count++;
          console.log(`Migrated: ${p.name} (${p.type})`);
        }
      }
    }
    
    console.log(`Migration complete! ${count} parties added to Parties Master.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
