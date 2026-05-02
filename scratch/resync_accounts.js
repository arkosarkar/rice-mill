const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function sync() {
  try {
    console.log('Starting Accounting Re-sync...');

    // 1. Get standard ledgers
    const ledgerRows = await sql`SELECT id, name FROM ledgers`;
    const getId = (name) => ledgerRows.find(l => l.name.toLowerCase() === name.toLowerCase())?.id;

    const purchaseId = getId('Paddy Purchase A/C');
    const gstId      = getId('Input GST A/C');
    const dedId      = getId('Deductions & Commission A/C');
    const cashId     = getId('Cash in Hand');
    const salesId    = getId('Sales Account');
    const gstPayableId = getId('GST Payable');

    if (!purchaseId || !cashId || !salesId) {
      throw new Error('Crucial ledgers still missing. Check init script.');
    }

    // 2. Fix Paddy Inwards
    const inwards = await sql`
      SELECT i.* FROM paddy_inwards i 
      WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.ref_module = 'Paddy Inward' AND t.ref_id = i.id::text)
    `;
    console.log(`Syncing ${inwards.length} Paddy Inwards...`);

    for (const i of inwards) {
      await sql.begin(async tx => {
        const vch = `SYNC-INW-${i.id}`;
        // Debit Purchase
        await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                 VALUES (${i.entry_date}, 'PURCHASE', ${vch}, ${purchaseId}, ${cashId}, ${i.total_amount}, 'Auto-sync inward', 'Paddy Inward', ${i.id})`;
        
        // If GST
        if (Number(i.gst_amount) > 0 && gstId) {
           await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                    VALUES (${i.entry_date}, 'GST', ${vch}, ${gstId}, ${cashId}, ${i.gst_amount}, 'GST Input', 'Paddy Inward', ${i.id})`;
        }
      });
    }

    // 3. Fix Sales
    const sales = await sql`
      SELECT s.* FROM sales s
      WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.ref_module = 'Sale' AND t.ref_id = s.id::text)
    `;
    console.log(`Syncing ${sales.length} Sales...`);

    for (const s of sales) {
      await sql.begin(async tx => {
        const vch = `SYNC-SLE-${s.id}`;
        // Credit Sales
        await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                 VALUES (${s.invoice_date}, 'SALE', ${vch}, ${cashId}, ${salesId}, ${s.taxable_value}, 'Auto-sync sale', 'Sale', ${s.id})`;
        
        // If GST
        if (Number(s.cgst_amount || 0) + Number(s.sgst_amount || 0) > 0 && gstPayableId) {
           const tax = Number(s.cgst_amount || 0) + Number(s.sgst_amount || 0);
           await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                    VALUES (${s.invoice_date}, 'GST', ${vch}, ${cashId}, ${gstPayableId}, ${tax}, 'GST Output', 'Sale', ${s.id})`;
        }
      });
    }

    console.log('Re-sync completed.');
    process.exit(0);
  } catch (error) {
    console.error('Re-sync failed:', error);
    process.exit(1);
  }
}

sync();
