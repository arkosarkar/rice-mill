const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function sync() {
  try {
    console.log('Starting Robust Accounting Re-sync...');

    // 0. Merge known duplicate ledgers (kaushik example)
    const ledgers = await sql`SELECT id, name FROM ledgers`;
    const findDupe = (namePart) => ledgers.filter(l => l.name.toLowerCase().includes(namePart.toLowerCase()));
    
    const kaushikDupes = findDupe('kaushik');
    if (kaushikDupes.length > 1) {
      const main = kaushikDupes.find(l => l.name.includes('-')) || kaushikDupes[0];
      const others = kaushikDupes.filter(l => l.id !== main.id);
      for (const o of others) {
        console.log(`Merging ledger ${o.name} (ID:${o.id}) into ${main.name} (ID:${main.id})`);
        await sql`UPDATE transactions SET debit_ledger_id = ${main.id} WHERE debit_ledger_id = ${o.id}`;
        await sql`UPDATE transactions SET credit_ledger_id = ${main.id} WHERE credit_ledger_id = ${o.id}`;
        await sql`DELETE FROM ledgers WHERE id = ${o.id}`;
      }
    }

    // Refresh ledger rows
    const ledgerRows = await sql`SELECT id, name FROM ledgers`;
    const getId = (name) => {
      // Priority 1: Exact match Name - Mobile
      // Priority 2: Contains Name
      return ledgerRows.find(l => l.name.toLowerCase() === name.toLowerCase())?.id ||
             ledgerRows.find(l => l.name.toLowerCase().includes(name.toLowerCase()))?.id;
    };

    const purchaseId = getId('Paddy Purchase A/C');
    const gstInputId = getId('Input GST A/C');
    const cashId     = getId('Cash in Hand');
    const salesId    = getId('Sales Account');
    const gstOutputId = getId('GST Payable');

    // 1. Paddy Inwards
    const inwards = await sql`SELECT * FROM paddy_inwards`;
    for (const i of inwards) {
      const idStr = String(i.id);
      const inwardNo = i.inward_no;
      // Check if Purchase transaction exists
      const exists = await sql`SELECT 1 FROM transactions WHERE ref_module = 'PURCHASE' AND ref_id = ${inwardNo} AND voucher_no LIKE 'PUR-%'`;
      if (exists.length === 0) {
        console.log(`Syncing missing purchase for inward ${inwardNo}`);
        const vendorId = getId(i.supplier_name);
        if (vendorId && purchaseId) {
          await sql.begin(async tx => {
            const vch = `PUR-${inwardNo}`;
            await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                     VALUES (${i.entry_date}, 'Journal', ${vch}, ${purchaseId}, ${vendorId}, ${i.payable_amount}, 'Auto-sync purchase', 'PURCHASE', ${inwardNo})`;
          });
        }
      }
      
      // Check if Payment transaction exists
      const payExists = await sql`SELECT 1 FROM transactions WHERE ref_module = 'PURCHASE' AND ref_id = ${inwardNo} AND voucher_no LIKE 'PAY-%'`;
      if (payExists.length === 0 && Number(i.advance_paid) > 0) {
         console.log(`Syncing missing payment for inward ${inwardNo}`);
         const vendorId = getId(i.supplier_name);
         if (vendorId && cashId) {
            await sql`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                     VALUES (${i.entry_date}, 'Payment', ${'PAY-' + inwardNo}, ${vendorId}, ${cashId}, ${i.advance_paid}, 'Auto-sync payment', 'PURCHASE', ${inwardNo})`;
         }
      }
    }

    // 2. Sales (similar logic)
    const sales = await sql`SELECT * FROM sales`;
    for (const s of sales) {
      const invoiceNo = s.invoice_no;
      const exists = await sql`SELECT 1 FROM transactions WHERE ref_module = 'SALE' AND ref_id = ${invoiceNo} AND voucher_no LIKE 'JRN-SALE-%'`;
      if (exists.length === 0) {
        console.log(`Syncing missing sale for invoice ${invoiceNo}`);
        const customerId = getId(s.customer_name);
        if (customerId && salesId) {
           await sql`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                    VALUES (${s.invoice_date}, 'Journal', ${'JRN-SALE-' + invoiceNo}, ${customerId}, ${salesId}, ${s.taxable_value}, 'Auto-sync sale', 'SALE', ${invoiceNo})`;
        }
      }
    }

    console.log('Robust Re-sync completed.');
    process.exit(0);
  } catch (error) {
    console.error('Robust Re-sync failed:', error);
    process.exit(1);
  }
}

sync();
