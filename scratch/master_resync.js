const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function sync() {
  try {
    console.log('Starting Master Accounting Re-sync...');

    const ledgerRows = await sql`SELECT id, name FROM ledgers`;
    const getId = (name) => ledgerRows.find(l => l.name.toLowerCase() === name.toLowerCase())?.id;

    const purchaseId = getId('Paddy Purchase A/C');
    const gstInputId = getId('Input GST A/C');
    const cashId     = getId('Cash in Hand');
    const salesId    = getId('Sales Account');
    const gstOutputId = getId('GST Payable');
    const labourId   = getId('Direct Labour - Cleaning');
    const powerId    = getId('Electricity/Fuel Expense');

    // 1. Paddy Inwards
    const inwards = await sql`SELECT * FROM paddy_inwards`;
    for (const i of inwards) {
      const idStr = String(i.id);
      const exists = await sql`SELECT 1 FROM transactions WHERE (ref_module = 'PURCHASE' OR ref_module = 'Paddy Inward') AND ref_id = ${idStr}`;
      if (exists.length === 0) {
        await sql.begin(async tx => {
          const vch = `RSYNC-INW-${i.id}`;
          await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                   VALUES (${i.entry_date}, 'PURCHASE', ${vch}, ${purchaseId}, ${cashId}, ${i.total_amount}, 'Auto-sync inward', 'PURCHASE', ${idStr})`;
          if (Number(i.gst_amount) > 0 && gstInputId) {
            await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                     VALUES (${i.entry_date}, 'GST', ${vch + '-GST'}, ${gstInputId}, ${cashId}, ${i.gst_amount}, 'GST Input', 'PURCHASE', ${idStr})`;
          }
        });
      }
    }

    // 2. Sales
    const sales = await sql`SELECT * FROM sales`;
    for (const s of sales) {
      const idStr = String(s.id);
      const exists = await sql`SELECT 1 FROM transactions WHERE (ref_module = 'SALE' OR ref_module = 'Sale') AND ref_id = ${idStr}`;
      if (exists.length === 0) {
        await sql.begin(async tx => {
          const vch = `RSYNC-SLE-${s.id}`;
          await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                   VALUES (${s.invoice_date}, 'SALE', ${vch}, ${cashId}, ${salesId}, ${s.taxable_value}, 'Auto-sync sale', 'SALE', ${idStr})`;
          const tax = Number(s.cgst_amount || 0) + Number(s.sgst_amount || 0) + Number(s.igst_amount || 0);
          if (tax > 0 && gstOutputId) {
            await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                     VALUES (${s.invoice_date}, 'GST', ${vch + '-GST'}, ${cashId}, ${gstOutputId}, ${tax}, 'GST Output', 'SALE', ${idStr})`;
          }
        });
      }
    }

    // 3. Cleaning
    const cleaning = await sql`SELECT * FROM cleaning_batches`;
    for (const c of cleaning) {
      const idStr = String(c.id);
      const exists = await sql`SELECT 1 FROM transactions WHERE ref_module = 'CLEANING' AND ref_id = ${idStr}`;
      if (exists.length === 0) {
        await sql.begin(async tx => {
          const vch = `RSYNC-CLN-${c.id}`;
          if (Number(c.labour_cost) > 0 && labourId) {
             await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                      VALUES (${c.process_date}, 'PAYMENT', ${vch + '-LAB'}, ${labourId}, ${cashId}, ${c.labour_cost}, 'Cleaning Labour', 'CLEANING', ${idStr})`;
          }
          if (Number(c.power_consumption) > 0 && powerId) {
             await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                      VALUES (${c.process_date}, 'PAYMENT', ${vch + '-PWR'}, ${powerId}, ${cashId}, ${c.power_consumption}, 'Power Cost', 'CLEANING', ${idStr})`;
          }
        });
      }
    }

    // 4. Production
    const prod = await sql`SELECT * FROM productions`;
    for (const p of prod) {
      const idStr = String(p.id);
      const exists = await sql`SELECT 1 FROM transactions WHERE ref_module = 'PRODUCTION' AND ref_id = ${idStr}`;
      if (exists.length === 0) {
        await sql.begin(async tx => {
          const vch = `RSYNC-PRD-${p.id}`;
          if (Number(p.labour_cost) > 0 && labourId) {
             await tx`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
                      VALUES (${p.process_date}, 'PAYMENT', ${vch + '-LAB'}, ${labourId}, ${cashId}, ${p.labour_cost}, 'Milling Labour', 'PRODUCTION', ${idStr})`;
          }
        });
      }
    }

    console.log('Master Re-sync completed.');
    process.exit(0);
  } catch (error) {
    console.error('Master Re-sync failed:', error);
    process.exit(1);
  }
}

sync();
