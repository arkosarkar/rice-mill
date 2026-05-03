const sql = require('../config/db');

exports.getParties = async (req, res) => {
  try {
    const { type } = req.query;
    let parties;
    
    // Strict calculation: (Opening Bal adjusted by Type) + SUM(Debits) - SUM(Credits)
    // Forced numeric conversion for aggregation results
    const balanceQuery = `
      (
        COALESCE(CAST(p.opening_balance AS NUMERIC), 0) * (CASE WHEN p.type = 'Farmer' THEN -1 ELSE 1 END) + 
        COALESCE((
          SELECT SUM(CASE 
            WHEN t.debit_ledger_id = p.ledger_id THEN CAST(t.amount AS NUMERIC) 
            ELSE -CAST(t.amount AS NUMERIC) 
          END)
          FROM transactions t
          WHERE t.debit_ledger_id = p.ledger_id OR t.credit_ledger_id = p.ledger_id
        ), 0)
      ) as ledger_balance,
      (
        SELECT COUNT(*) 
        FROM transactions t 
        WHERE t.debit_ledger_id = p.ledger_id OR t.credit_ledger_id = p.ledger_id
      ) as tx_count
    `;

    let query = `SELECT p.*, ${balanceQuery} FROM parties p`;
    let params = [];

    if (type && type !== 'All') {
      if (type === 'Both') {
        query += ` WHERE p.type = 'Both'`;
      } else {
        query += ` WHERE p.type = $1 OR p.type = 'Both'`;
        params.push(type);
      }
    }
    
    query += ` ORDER BY p.name ASC`;
    
    parties = await sql(query, ...params);
    
    // 3. Final Pipeline Data Formatting
    const formattedParties = parties.map(p => {
      const bal = parseFloat(p.ledger_balance || 0);
      return {
        ...p,
        ledger_balance: Number.isNaN(bal) ? 0 : bal,
        tx_count: parseInt(p.tx_count || 0, 10)
      };
    });

    // Logging for Render terminal debugging
    console.log('\n--- PARTIES DATA PIPELINE SYNC ---');
    console.table(formattedParties.map(p => ({ 
      name: p.name, 
      id: p.id, 
      ledger_id: p.ledger_id, 
      balance: p.ledger_balance, 
      txs: p.tx_count 
    })));

    res.json(formattedParties);
  } catch (error) {
    console.error('Error fetching parties:', error);
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
};

exports.createParty = async (req, res) => {
  try {
    const { name, type, mobile_number, address, state, email, shipping_address, credit_limit, opening_balance_date, gst_number, gst_status, opening_balance, note } = req.body;
    
    if (!mobile_number) {
        return res.status(400).json({ error: 'Mobile number is required' });
    }

    // 1. Determine ledger group based on party type
    let group_name = 'Debtors'; // Default for Customer or Both
    if (type === 'Farmer') {
      group_name = 'Creditors';
    }

    // 2. Check if Ledger exists using uniquely formatted name
    let ledger_id;
    const ledgerName = `${name} - ${mobile_number}`;
    const existingLedger = await sql`SELECT id FROM ledgers WHERE name = ${ledgerName}`;
    
    if (existingLedger.length > 0) {
      ledger_id = existingLedger[0].id;
      // Update existing ledger fields to match party
      await sql`
        UPDATE ledgers 
        SET mobile = ${mobile_number}, address = ${address || ''}, email = ${email || ''}, gst_status = ${gst_status || 'Unregistered'}, group_name = ${group_name}
        WHERE id = ${ledger_id}
      `;
    } else {
      // 3. Create Ledger
      const newLedger = await sql`
        INSERT INTO ledgers (name, group_name, opening_balance, current_balance, mobile, address, email, gst_status)
        VALUES (${ledgerName}, ${group_name}, COALESCE(${opening_balance || 0}, 0), COALESCE(${opening_balance || 0}, 0), ${mobile_number}, ${address || ''}, ${email || ''}, ${gst_status || 'Unregistered'})
        RETURNING id
      `;
      ledger_id = newLedger[0].id;
    }

    // 4. Create Party
    const newParty = await sql`
      INSERT INTO parties (name, type, mobile_number, address, state, email, shipping_address, credit_limit, opening_balance_date, gst_number, gst_status, opening_balance, note, ledger_id)
      VALUES (${name}, ${type}, ${mobile_number}, ${address || ''}, ${state || ''}, ${email || ''}, ${shipping_address || ''}, COALESCE(${credit_limit || 0}, 0), ${opening_balance_date || null}, ${gst_number || ''}, ${gst_status || 'Unregistered'}, COALESCE(${opening_balance || 0}, 0), ${note || ''}, ${ledger_id})
      RETURNING *
    `;

    // 5. Update Ledger with linked_party_id
    await sql`UPDATE ledgers SET linked_party_id = ${newParty[0].id} WHERE id = ${ledger_id}`;

    res.status(201).json(newParty[0]);
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'parties_mobile_unique') {
        return res.status(400).json({ error: 'A party with this Mobile Number already exists. Please search and select the existing party from the list.' });
    }
    console.error('Error creating party:', error);
    res.status(500).json({ error: 'Failed to create party', details: error.message });
  }
};

exports.updateParty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, mobile_number, address, state, email, shipping_address, credit_limit, opening_balance_date, gst_number, gst_status, note } = req.body;
    
    if (!mobile_number) {
        return res.status(400).json({ error: 'Mobile number is required' });
    }

    const updatedParty = await sql`
      UPDATE parties
      SET name = ${name}, type = ${type}, mobile_number = ${mobile_number}, address = ${address || ''}, state = ${state || ''}, email = ${email || ''}, shipping_address = ${shipping_address || ''}, credit_limit = COALESCE(${credit_limit || 0}, 0), opening_balance_date = ${opening_balance_date || null},
          gst_number = ${gst_number || ''}, gst_status = ${gst_status || 'Unregistered'}, note = ${note || ''}
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (updatedParty.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    // Sync updates to Ledger
    let group_name = 'Debtors';
    if (type === 'Farmer') group_name = 'Creditors';
    
    if (updatedParty[0].ledger_id) {
      const ledgerName = `${name} - ${mobile_number}`;
      await sql`
        UPDATE ledgers
        SET name = ${ledgerName}, group_name = ${group_name}, mobile = ${mobile_number}, address = ${address || ''}, email = ${email || ''}, gst_status = ${gst_status || 'Unregistered'}
        WHERE id = ${updatedParty[0].ledger_id}
      `;
    }
    
    res.json(updatedParty[0]);
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'parties_mobile_unique') {
        return res.status(400).json({ error: 'A party with this Mobile Number already exists.' });
    }
    console.error('Error updating party:', error);
    res.status(500).json({ error: 'Failed to update party' });
  }
};

exports.deleteParty = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get Party Info (including ledger_id and name)
    const party = await sql`SELECT name, ledger_id FROM parties WHERE id = ${id}`;
    if (party.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    const partyName = party[0].name;

    // 2. Check usage in Paddy Inward
    const usedInPaddy = await sql`SELECT id FROM paddy_inwards WHERE supplier_name = ${partyName} LIMIT 1`;
    if (usedInPaddy.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete party', 
        message: 'This party has active records in Paddy Inward. Please delete those records first.' 
      });
    }

    // 3. Check usage in Sales
    const usedInSales = await sql`SELECT id FROM sales WHERE customer_name = ${partyName} LIMIT 1`;
    if (usedInSales.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete party', 
        message: 'This party has active Sales invoices. Please delete those invoices first.' 
      });
    }

    // 4. Perform deletion (wrapped in transaction implicitly if possible, or sequential)
    // Delete Linked Ledger first if exists
    if (party[0].ledger_id) {
       await sql`DELETE FROM ledgers WHERE id = ${party[0].ledger_id}`;
    }

    const deleted = await sql`DELETE FROM parties WHERE id = ${id} RETURNING id`;
    
    res.json({ message: 'Party and linked ledger deleted successfully' });
  } catch (error) {
    console.error('Error deleting party:', error);
    res.status(500).json({ error: 'Failed to delete party', details: error.message });
  }
};

exports.getMigrationPreview = async (req, res) => {
  try {
    const uniqueFarmers = await sql`
      SELECT DISTINCT supplier_name as name, contact_number as mobile_number, 'Farmer' as type 
      FROM paddy_inwards 
      WHERE supplier_name IS NOT NULL AND supplier_name != ''
    `;
    
    const uniqueCustomers = await sql`
      SELECT DISTINCT customer_name as name, contact_number as mobile_number, address, gst_number, 'Customer' as type 
      FROM sales
      WHERE customer_name IS NOT NULL AND customer_name != ''
    `;
    
    const existingParties = await sql`SELECT name FROM parties`;
    const existingNames = new Set(existingParties.map(p => p.name.toLowerCase().trim()));
    
    const preview = [...uniqueFarmers, ...uniqueCustomers].map(p => {
      return {
        ...p,
        exists: existingNames.has(p.name.toLowerCase().trim())
      };
    }).filter(p => !p.exists);

    const finalPreviewMap = new Map();
    for (let p of preview) {
       const key = p.name.toLowerCase().trim();
       if (finalPreviewMap.has(key)) {
          const existing = finalPreviewMap.get(key);
          if (existing.type !== p.type) {
             existing.type = 'Both';
             if (p.mobile_number && !existing.mobile_number) existing.mobile_number = p.mobile_number;
             if (p.address && !existing.address) existing.address = p.address;
             if (p.gst_number && !existing.gst_number) existing.gst_number = p.gst_number;
          }
       } else {
          finalPreviewMap.set(key, p);
       }
    }

    res.json(Array.from(finalPreviewMap.values()));
  } catch (error) {
    console.error('Error getting migration preview:', error);
    res.status(500).json({ error: 'Failed to fetch migration preview' });
  }
};

exports.bulkImportParties = async (req, res) => {
  try {
    const { parties } = req.body; 
    const imported = [];
    
    for (let p of parties) {
        let group_name = (p.type === 'Farmer') ? 'Creditors' : 'Debtors';
        
        let ledger_id;
        const existingLedger = await sql`SELECT id FROM ledgers WHERE name = ${p.name}`;
        if (existingLedger.length > 0) {
          ledger_id = existingLedger[0].id;
          await sql`UPDATE ledgers SET group_name = ${group_name}, mobile = ${p.mobile_number || ''}, address = ${p.address || ''}, gst_status = ${p.gst_status || 'Unregistered'} WHERE id = ${ledger_id}`;
        } else {
          const newLedger = await sql`
            INSERT INTO ledgers (name, group_name, opening_balance, current_balance, mobile, address, gst_status)
            VALUES (${p.name}, ${group_name}, 0, 0, ${p.mobile_number || ''}, ${p.address || ''}, ${p.gst_status || 'Unregistered'})
            RETURNING id
          `;
          ledger_id = newLedger[0].id;
        }

        const newParty = await sql`
          INSERT INTO parties (name, type, mobile_number, address, gst_number, gst_status, opening_balance, note, ledger_id)
          VALUES (${p.name}, ${p.type}, ${p.mobile_number || ''}, ${p.address || ''}, ${p.gst_number || ''}, ${p.gst_status || 'Unregistered'}, 0, 'Auto migrated', ${ledger_id})
          RETURNING *
        `;
        
        await sql`UPDATE ledgers SET linked_party_id = ${newParty[0].id} WHERE id = ${ledger_id}`;
        imported.push(newParty[0]);
    }
    
    res.json({ message: `Successfully imported ${imported.length} parties`, count: imported.length });
  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: 'Failed to bulk import parties' });
  }
};
