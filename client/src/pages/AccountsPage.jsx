import React, { useState, useEffect } from 'react';
import { 
  BanknotesIcon, 
  BuildingLibraryIcon, 
  DocumentTextIcon, 
  ReceiptRefundIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  DocumentChartBarIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import authFetch from '../utils/authFetch';
import { fetchPLStatement } from '../api/api';
import { PageContainer } from '../components/ui/Layout';
import StatCard from '../components/ui/StatCard';
import { API_URL } from '../api/config';

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmt = (n) => '₹' + Math.abs(toNum(n)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const INITIAL_ACCOUNTS = [
  { id: 1, name: 'Cash in Hand', group: 'assets', openingBalance: 0, type: 'cash' },
  { id: 2, name: 'SBI - Main Account', group: 'assets', openingBalance: 0, type: 'bank' },
  { id: 3, name: 'Sales Revenue', group: 'income', openingBalance: 0, type: 'income' },
  { id: 4, name: 'Purchase Account', group: 'expenses', openingBalance: 0, type: 'expense' },
];

const INITIAL_TRANSACTIONS = [];

const S = {
  card: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  statGreen: { background: '#4caf50', borderRadius: 12, padding: '20px 24px', color: '#fff', flex: 1 },
  statBlue: { background: 'linear-gradient(135deg,#1565c0,#42a5f5)', borderRadius: 12, padding: '20px 24px', color: '#fff', flex: 1 },
  statOrange: { background: 'linear-gradient(135deg,#e65100,#ff9800)', borderRadius: 12, padding: '20px 24px', color: '#fff', flex: 1 },
  statPurple: { background: 'linear-gradient(135deg,#4a148c,#7b1fa2)', borderRadius: 12, padding: '20px 24px', color: '#fff', flex: 1 },
  statRow: { display: 'flex', gap: 16, marginBottom: 24 },
  statLabel: { fontSize: 12, opacity: 0.85, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { fontSize: 28, fontWeight: 800 },
  statSub: { fontSize: 11, opacity: 0.75, marginTop: 4 },
  tabBar: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e0e0e0' },
  tab: (a) => ({ padding: '10px 16px', border: 'none', borderBottom: a ? '3px solid #1565c0' : '3px solid transparent', background: 'none', cursor: 'pointer', fontWeight: a ? 700 : 500, color: a ? '#1565c0' : '#555', fontSize: 13, marginBottom: -2 }),
  btn: (c = '#1565c0') => ({ padding: '8px 16px', background: c, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }),
  btnOutline: { padding: '8px 16px', background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  input: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box' },
  select: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', background: '#f5f6fa', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', borderBottom: '2px solid #e0e0e0' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13 },
  badge: (c) => ({ padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: c === 'green' ? '#e8f5e9' : c === 'red' ? '#ffebee' : c === 'blue' ? '#e3f2fd' : '#f3e5f5', color: c === 'green' ? '#2e7d32' : c === 'red' ? '#c62828' : c === 'blue' ? '#1565c0' : '#6a1b9a' }),
  modeBtn: { padding: '6px 14px', border: '2px solid #4caf50', borderRadius: 20, background: 'white', color: '#4caf50', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
};

function Modal({ title, onSave, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: 28, borderRadius: 14, width: '90%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e3c72' }}>{title}</h3>
          <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }} onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>{children}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button style={S.btnOutline} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn('#4caf50'), padding: '10px 24px', fontSize: 15 }} onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 13 }}>{label}</label>
      {children}
    </div>
  );
}

function AccountsPage() {
  const [mode, setMode] = useState('simple');
  const [expertTab, setExpertTab] = useState('ledger');
  const [showModal, setShowModal] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [dayBookDate, setDayBookDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgerFilter, setLedgerFilter] = useState('All');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [gstPaidAmount, setGstPaidAmount] = useState(0);

  // CSV Export state
  const [csvFrom, setCsvFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [csvTo, setCsvTo] = useState(new Date().toISOString().split('T')[0]);
  const [csvLoading, setCsvLoading] = useState(false);

  const [sales, setSales] = useState([]);
  const [paddyInward, setPaddyInward] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [plData, setPlData] = useState(null);
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const farmers = ['Ram Singh Farmer', 'Suresh Yadav Farmer', 'Mohan Lal Farmer'];
  const customers = ['Mohan Traders', 'Sri Ram Agency', 'Cash Customer'];
  const today = new Date().toISOString().split('T')[0];

  const emptyPaddy = { farmer: '', date: today, kg: '', rate: '', gstEnabled: false, gstPercent: '5', payment: 'cash', note: '' };
  const emptyRice = { customer: '', date: today, riceType: 'boiled', quantity: '', unit: 'bags', rate: '', gstPercent: '5', payment: 'cash', note: '' };
  const emptyReceipt = { receiptNo: '', from: '', amount: '', method: 'cash', date: today, note: '' };
  const emptyExpense = { type: 'labour', amount: '', method: 'cash', date: today, note: '' };
  const emptyReceive = { customerName: '', invoiceNo: '', invoiceId: null, totalBalanceDue: 0, amountReceiving: '', paymentMode: 'cash', date: today, note: '' };
  const emptyPay = { partyName: '', partyId: null, partyType: '', balanceDue: 0, amountPaying: '', paymentMode: 'cash', date: today, chequeNo: '', note: '' };
  const emptyDebitNote = { noteNo: '', date: today, customer: '', item: '', amount: '', note: '' };
  const emptyCreditNote = { noteNo: '', date: today, customer: '', item: '', amount: '', note: '' };
  const emptyAccount = { name: '', group: 'assets', openingBalance: '', initialDebit: '', initialCredit: '', closingBalance: '', note: '', mobile: '', gstStatus: 'unregistered', gstin: '', address: '' };

  const [paddyForm, setPaddyForm] = useState(emptyPaddy);
  const [riceForm, setRiceForm] = useState(emptyRice);
  const [receiptForm, setReceiptForm] = useState(emptyReceipt);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [receiveForm, setReceiveForm] = useState(emptyReceive);
  const [payForm, setPayForm] = useState(emptyPay);
  const [debitNoteForm, setDebitNoteForm] = useState(emptyDebitNote);
  const [debitNotes, setDebitNotes] = useState([]);
  const [creditNoteForm, setCreditNoteForm] = useState(emptyCreditNote);
  const [creditNotes, setCreditNotes] = useState([]);
  const [accountForm, setAccountForm] = useState(emptyAccount);
  const [editingAccountId, setEditingAccountId] = useState(null);

  const downloadTaxInvoiceCSV = async () => {
    if (!csvFrom || !csvTo) { showToast('Please select both From and To dates', 'error'); return; }
    if (csvFrom > csvTo) { showToast('From date cannot be after To date', 'error'); return; }
    setCsvLoading(true);
    try {
      const url = `/sales/report/csv?from=${csvFrom}&to=${csvTo}`;
      const res = await authFetch(url);
      if (!res.ok) { const err = await res.json().catch(() => ({})); showToast(err.message || 'Failed to download CSV', 'error'); return; }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Tax_Invoice_Report_${csvFrom}_to_${csvTo}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showToast('✓ CSV downloaded successfully!');
    } catch (e) {
      showToast('Error connecting to server', 'error');
    } finally {
      setCsvLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sRes, pRes, eRes, bsRes, lRes] = await Promise.all([
          authFetch('/sales').catch(() => null),
          authFetch('/paddy-inwards').catch(() => null),
          authFetch('/expenses').catch(() => null),
          authFetch(`/accounts/balance-sheet?asOf=${asOf}`).catch(() => null),
          authFetch('/accounts/ledgers').catch(() => null)
        ]);
        if (sRes?.ok) { const d = await sRes.json(); setSales(Array.isArray(d) ? d : []); }
        if (pRes?.ok) { const d = await pRes.json(); setPaddyInward(Array.isArray(d) ? d : []); }
        if (eRes?.ok) { const d = await eRes.json(); setExpenses(Array.isArray(d) ? d : []); }
        if (bsRes?.ok) { const d = await bsRes.json(); setBalanceSheet(d); }
        if (lRes?.ok) { 
          const d = await lRes.json(); 
          const normalized = (Array.isArray(d) ? d : []).map(acc => ({
            ...acc,
            group: acc.group_name || acc.group,
            openingBalance: toNum(acc.opening_balance || acc.openingBalance)
          }));
          setAccounts(normalized); 
        }

        // Fetch P&L Data
        try {
          const pLRes = await fetchPLStatement();
          setPlData(pLRes || { error: 'No data available' });
        } catch (err) {
          setPlData({ error: 'Failed to fetch P&L data' });
        }

      } catch (e) {
        console.error('API load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [asOf]);

  // ── COMPUTED ──────────────────────────────────────────────────────────────
  const todayRevenue = sales.filter(s => s.invoiceDate === today).reduce((sum, s) => sum + toNum(s.grandTotal), 0);
  const outputGSTReal = sales.reduce((sum, s) => sum + toNum(s.taxAmount), 0);
  const inputGSTReal = paddyInward.reduce((sum, p) => sum + toNum(p.gstAmount), 0);
  const gstPayable = Math.max(0, outputGSTReal - inputGSTReal - gstPaidAmount);

  const accountsReceivable = sales.filter(s => toNum(s.balanceDue) > 0);

  const expensePayables = expenses.filter(e => {
    const status = (e.paymentStatus || e.payment_status || '').toLowerCase();
    const due = toNum(e.amount) - toNum(e.amountPaid);
    return due > 0 || status === 'pending' || status === 'unpaid' || status === 'partial';
  });

  const farmerPayablesMap = {};
  paddyInward.forEach(p => {
    const total = toNum(p.payableAmount || p.totalAmount || p.grandTotal);
    const paid = toNum(p.advancePaid || p.amountPaid || p.amountReceived);
    const name = p.supplierName || p.farmerName || p.farmer_name || 'Unknown Farmer';

    if (!farmerPayablesMap[name]) {
      farmerPayablesMap[name] = { name, total: 0, paid: 0, ids: [] };
    }
    farmerPayablesMap[name].total += total;
    farmerPayablesMap[name].paid += paid;
    farmerPayablesMap[name].ids.push(p.id);
  });

  const groupedFarmerPayables = [];
  const farmerAdvances = [];

  Object.values(farmerPayablesMap).forEach(data => {
     if (data.total <= 0) return; // Prevent ghost farmers with 0 paddy
     const balance = data.total - data.paid;
     if (balance > 0) {
        groupedFarmerPayables.push({ ...data, due: balance });
     } else if (balance < 0) {
        farmerAdvances.push({ ...data, advance: -balance });
     }
  });

  const groupedCustomerReceivables = [];
  const customerReceivablesMap = {};
  
  accountsReceivable.forEach(s => {
    const name = s.customerName || 'Unknown Customer';
    if (!customerReceivablesMap[name]) {
      customerReceivablesMap[name] = { name, totalBalanceDue: 0, invoices: [] };
    }
    customerReceivablesMap[name].totalBalanceDue += toNum(s.balanceDue);
    customerReceivablesMap[name].invoices.push(s);
  });
  
  Object.values(customerReceivablesMap).forEach(data => {
    if (data.totalBalanceDue > 0) {
      groupedCustomerReceivables.push(data);
    }
  });

  const totalReceivable = groupedCustomerReceivables.reduce((sum, c) => sum + c.totalBalanceDue, 0);

  const totalPayable = groupedFarmerPayables.reduce((sum, p) => sum + p.due, 0) + 
                       expensePayables.reduce((sum, e) => sum + toNum(e.amount), 0) + 
                       gstPayable;

  const totalSalesTaxable = sales.reduce((sum, s) => sum + toNum(s.taxable_value || s.totalAmount), 0);
  const totalReceipts = transactions.filter(t => t.type === 'receipt').reduce((s, t) => s + t.amount, 0);
  const totalRevenue = totalSalesTaxable + totalReceipts;

  const totalExpenses = transactions.filter(t => ['purchase', 'expense'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const outputGST = sales.reduce((sum, s) => sum + (toNum(s.cgst_amount) + toNum(s.sgst_amount) + toNum(s.igst_amount) || toNum(s.taxAmount)), 0);
  const inputGST = transactions.filter(t => t.type === 'purchase').reduce((s, t) => s + (t.gst || 0), 0);
  const netGST = outputGST - inputGST;
  const bankBalance = accounts.find(a => a.name === 'SBI - Main Account')?.openingBalance || 0;

  const getLedgerData = (account) => {
    const initialDebit = account.initialDebit ? toNum(account.initialDebit) : 0;
    const initialCredit = account.initialCredit ? toNum(account.initialCredit) : 0;
    const debit = initialDebit + transactions.filter(t => t.debitAccount === account.name).reduce((s, t) => s + t.amount, 0);
    const credit = initialCredit + transactions.filter(t => t.creditAccount === account.name).reduce((s, t) => s + t.amount, 0);
    
    let base = account.openingBalance;
    if (account.closingBalance !== undefined && account.closingBalance !== '') base = toNum(account.closingBalance);
    
    const closing = ['assets', 'expenses', 'debtors'].includes(account.group)
      ? base + debit - credit
      : base + credit - debit;
    return { debit, credit, closing };
  };

  const filteredAccounts = accounts.filter(a => {
    const matchGroup = ledgerFilter === 'All' || a.group === ledgerFilter.toLowerCase();
    const matchSearch = a.name.toLowerCase().includes(ledgerSearch.toLowerCase());
    return matchGroup && matchSearch;
  });

  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { month: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
  }).reverse();

  const monthlyData = last12Months.map(m => {
    const s = transactions.filter(t => t.type === 'sale' && t.date.startsWith(m.key)).reduce((a, t) => a + t.amount, 0);
    const e = transactions.filter(t => ['purchase', 'expense'].includes(t.type) && t.date.startsWith(m.key)).reduce((a, t) => a + t.amount, 0);
    return { ...m, sales: s, expenses: e, profit: s - e };
  });

  // ── FORM CALCULATIONS ─────────────────────────────────────────────────────
  const paddyTotal = paddyForm.kg && paddyForm.rate ? parseFloat(paddyForm.kg) * parseFloat(paddyForm.rate) : 0;
  const paddyGST = paddyForm.gstEnabled ? paddyTotal * parseFloat(paddyForm.gstPercent) / 100 : 0;
  const paddyGrand = paddyTotal + paddyGST;
  const riceTotal = riceForm.quantity && riceForm.rate ? parseFloat(riceForm.quantity) * parseFloat(riceForm.rate) : 0;
  const riceGST = riceTotal * parseFloat(riceForm.gstPercent) / 100;
  const riceGrand = riceTotal + riceGST;

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const handlePaddyPurchase = () => {
    if (!paddyForm.farmer || !paddyForm.kg || !paddyForm.rate) { showToast('Please fill all fields', 'error'); return; }
    const tx = { id: transactions.length + 1, date: paddyForm.date, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), description: `Paddy from ${paddyForm.farmer}`, amount: paddyGrand, type: 'purchase', party: paddyForm.farmer, gst: paddyGST, debitAccount: 'Purchase Account', creditAccount: paddyForm.payment === 'bank' ? 'SBI - Main Account' : 'Cash in Hand', expenseCategory: 'paddy' };
    setTransactions(p => [...p, tx]); setShowModal(null); setPaddyForm(emptyPaddy); showToast('✓ Paddy purchase saved!');
  };

  const handleRiceSale = () => {
    if (!riceForm.customer || !riceForm.quantity || !riceForm.rate) { showToast('Please fill all fields', 'error'); return; }
    const tx = { id: transactions.length + 1, date: riceForm.date, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), description: `Rice sold to ${riceForm.customer}`, amount: riceGrand, type: 'sale', party: riceForm.customer, gst: riceGST, debitAccount: riceForm.payment === 'bank' ? 'SBI - Main Account' : 'Cash in Hand', creditAccount: 'Sales Revenue', expenseCategory: null };
    setTransactions(p => [...p, tx]); setShowModal(null); setRiceForm(emptyRice); showToast('✓ Rice sale saved!');
  };

  const handleReceipt = () => {
    if (!receiptForm.from || !receiptForm.amount) { showToast('Please fill all fields', 'error'); return; }
    const description = receiptForm.receiptNo ? `Receipt #${receiptForm.receiptNo} from ${receiptForm.from}` : `Receipt from ${receiptForm.from}`;
    const tx = { id: transactions.length + 1, date: receiptForm.date, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), description: description, amount: parseFloat(receiptForm.amount), type: 'receipt', party: receiptForm.from, gst: 0, debitAccount: receiptForm.method === 'bank' ? 'SBI - Main Account' : 'Cash in Hand', creditAccount: receiptForm.from, expenseCategory: null };
    setTransactions(p => [...p, tx]); setShowModal(null); setReceiptForm(emptyReceipt); showToast('✓ Receipt recorded!');
  };

  const handleExpense = () => {
    if (!expenseForm.amount) { showToast('Please fill all fields', 'error'); return; }
    const tx = { id: transactions.length + 1, date: expenseForm.date, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), description: `${expenseForm.type} expense`, amount: parseFloat(expenseForm.amount), type: 'expense', party: expenseForm.type, gst: 0, debitAccount: 'Labour Expenses', creditAccount: expenseForm.method === 'bank' ? 'SBI - Main Account' : 'Cash in Hand', expenseCategory: expenseForm.type };
    setTransactions(p => [...p, tx]); setShowModal(null); setExpenseForm(emptyExpense); showToast('✓ Expense recorded!');
  };

  const handleReceivePayment = async () => {
    const amt = parseFloat(receiveForm.amountReceiving);
    if (!amt || amt <= 0) { showToast('Enter valid amount', 'error'); return; }
    if (amt > receiveForm.totalBalanceDue) { showToast('Amount exceeds balance due', 'error'); return; }
    try {
        const res = await authFetch('/sales/payment', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerName: receiveForm.customerName, amountReceived: amt, paymentMode: receiveForm.paymentMode, date: receiveForm.date, note: receiveForm.note }),
        });
      if (res.ok) {
        const fresh = await authFetch('/sales');
        if (fresh.ok) { const d = await fresh.json(); setSales(Array.isArray(d) ? d : []); }
        setShowModal(null); setReceiveForm(emptyReceive); showToast('✓ Payment received!');
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.message || 'Failed to process payment', 'error');
      }
    } catch {
      showToast('Error connecting to backend', 'error');
    }
  };

  const handleMakePayment = async () => {
    const amt = parseFloat(payForm.amountPaying);
    if (!amt || amt <= 0) { showToast('Enter valid amount', 'error'); return; }
    if (amt > payForm.balanceDue) { showToast('Amount exceeds balance due', 'error'); return; }
    const body = { amount: amt, paymentMode: payForm.paymentMode, date: payForm.date, note: payForm.note };
    if (payForm.paymentMode === 'cheque') body.chequeNo = payForm.chequeNo;
    let endpoint = '';
    if (payForm.partyType === 'farmer') { endpoint = '/paddy-inwards/payment'; body.farmerName = payForm.partyName; body.paddyId = payForm.partyId; }
    else if (payForm.partyType === 'gst') { endpoint = '/gst/payment'; }
    else { endpoint = '/expenses/payment'; body.expenseId = payForm.partyId; }
    try {
      const res = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        if (payForm.partyType === 'farmer') { const fresh = await authFetch('/paddy-inward'); if (fresh.ok) { const d = await fresh.json(); setPaddyInward(Array.isArray(d) ? d : []); } }
        else if (payForm.partyType === 'gst') { setGstPaidAmount(prev => prev + amt); }
        else { const fresh = await authFetch('/expenses'); if (fresh.ok) { const d = await fresh.json(); setExpenses(Array.isArray(d) ? d : []); } }
      } else {
        if (payForm.partyType === 'farmer') setPaddyInward(prev => prev.map(p => { const newPaid = toNum(p.amountPaid) + amt; return p.id === payForm.partyId ? { ...p, amountPaid: newPaid, paymentStatus: (toNum(p.totalAmount || p.grandTotal) - newPaid <= 0 ? 'paid' : 'partial') } : p }));
        else if (payForm.partyType === 'gst') setGstPaidAmount(prev => prev + amt);
        else setExpenses(prev => prev.map(e => { const newPaid = toNum(e.amountPaid) + amt; return e.id === payForm.partyId ? { ...e, amountPaid: newPaid, paymentStatus: (toNum(e.amount) - newPaid <= 0 ? 'paid' : 'partial') } : e }));
      }
    } catch {
      if (payForm.partyType === 'farmer') setPaddyInward(prev => prev.map(p => { const newPaid = toNum(p.amountPaid) + amt; return p.id === payForm.partyId ? { ...p, amountPaid: newPaid, paymentStatus: (toNum(p.totalAmount || p.grandTotal) - newPaid <= 0 ? 'paid' : 'partial') } : p }));
      else if (payForm.partyType === 'gst') setGstPaidAmount(prev => prev + amt);
      else setExpenses(prev => prev.map(e => { const newPaid = toNum(e.amountPaid) + amt; return e.id === payForm.partyId ? { ...e, amountPaid: newPaid, paymentStatus: (toNum(e.amount) - newPaid <= 0 ? 'paid' : 'partial') } : e }));
    }
    setShowModal(null); setPayForm(emptyPay); showToast('✓ Payment recorded!');
  };

  const handleDebitNote = () => {
    if (!debitNoteForm.noteNo || !debitNoteForm.customer || !debitNoteForm.amount) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    const dn = { ...debitNoteForm, id: debitNotes.length + 1 };
    setDebitNotes(p => [...p, dn]);
    setShowModal(null);
    setDebitNoteForm(emptyDebitNote);
    showToast('✓ Debit Note created!');
  };

  const handleCreditNote = () => {
    if (!creditNoteForm.noteNo || !creditNoteForm.customer || !creditNoteForm.amount) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    const cn = { ...creditNoteForm, id: creditNotes.length + 1 };
    setCreditNotes(p => [...p, cn]);
    setShowModal(null);
    setCreditNoteForm(emptyCreditNote);
    showToast('✓ Credit Note created!');
  };

  const handleNewAccount = async () => {
    if (!accountForm.name || !accountForm.group) {
      showToast('Please enter an account name and group', 'error');
      return;
    }
    
    try {
      const payload = {
        name: accountForm.name,
        group_name: accountForm.group,
        opening_balance: toNum(accountForm.openingBalance)
      };

      if (editingAccountId) {
        const res = await authFetch(`/accounts/ledgers/${editingAccountId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const raw = await res.json();
          const normalized = {
            ...raw,
            group: raw.group_name || raw.group,
            openingBalance: toNum(raw.opening_balance || raw.openingBalance)
          };
          setAccounts(p => p.map(a => a.id === normalized.id ? normalized : a));
          showToast('✓ Ledger Account updated successfully!');
          // Refresh balance sheet to reflect changes
          authFetch(`/accounts/balance-sheet?asOf=${asOf}`).then(r => r.ok && r.json()).then(d => d && setBalanceSheet(d));
        }
      } else {
        const res = await authFetch('/accounts/ledgers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const raw = await res.json();
          const normalized = {
            ...raw,
            group: raw.group_name || raw.group,
            openingBalance: toNum(raw.opening_balance || raw.openingBalance)
          };
          setAccounts(p => [...p, normalized]);
          showToast('✓ Ledger Account added successfully!');
          // Refresh balance sheet to reflect changes
          authFetch(`/accounts/balance-sheet?asOf=${asOf}`).then(r => r.ok && r.json()).then(d => d && setBalanceSheet(d));
        }
      }
      
      setShowModal(null);
      setAccountForm(emptyAccount);
      setEditingAccountId(null);
    } catch (e) {
      showToast('Failed to save account', 'error');
    }
  };

  // ── SIMPLE MODE ───────────────────────────────────────────────────────────
  const SimpleMode = () => (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Aaj Ki Kamaai" value={fmt(todayRevenue)} unit="REVENUE" icon={BanknotesIcon} colorClass="text-green-600" iconBg="bg-green-50" />
        <StatCard title="Bank Balance (SBI)" value={fmt(bankBalance)} unit="BALANCE" icon={BuildingLibraryIcon} colorClass="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Accounts Receivable" value={fmt(totalReceivable)} unit="UNPAID" icon={ReceiptRefundIcon} colorClass="text-orange-600" iconBg="bg-orange-50" />
        <StatCard title="Accounts Payable" value={fmt(totalPayable)} unit="PENDING" icon={DocumentTextIcon} colorClass="text-purple-600" iconBg="bg-purple-50" />
      </div>

      {/* Transaction Entry removed per user request */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Receivable */}
        <div style={S.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Accounts Receivable Ledger</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>⏳ Loading...</div>
          ) : accountsReceivable.length === 0 && farmerAdvances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#4caf50', fontWeight: 600 }}>✅ All receivables are cleared!</div>
          ) : (
            <>
              {groupedCustomerReceivables.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4caf50', marginBottom: 8, textTransform: 'uppercase' }}>🏪 Customer Receivables</div>
                  {groupedCustomerReceivables.map(c => (
                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Unpaid Invoices: {c.invoices.length}</div>
                      </div>
                      <div style={{ textAlign: 'right', marginRight: 10 }}>
                        <div style={{ color: '#c62828', fontWeight: 700, fontSize: 15 }}>Due: {fmt(c.totalBalanceDue)}</div>
                      </div>
                      <button
                        style={S.btn('#4caf50')}
                        onClick={() => {
                          setReceiveForm({ customerName: c.name, invoiceNo: '', invoiceId: null, totalBalanceDue: c.totalBalanceDue, amountReceiving: '', paymentMode: 'cash', date: today, note: '' });
                          setShowModal('receivePayment');
                        }}
                      >
                        Receive
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {farmerAdvances.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', marginBottom: 8, textTransform: 'uppercase' }}>💸 Farmer Advances</div>
                  {farmerAdvances.map((adv, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{adv.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Total Paddy: {fmt(adv.total)}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>Paid Amount: {fmt(adv.paid)}</div>
                      </div>
                      <div style={{ textAlign: 'right', marginRight: 10 }}>
                        <div style={{ color: '#1565c0', fontWeight: 700, fontSize: 15 }}>Advance: {fmt(adv.advance)}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Overpaid</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        {/* Payable */}
        <div style={S.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Accounts Payable Ledger</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>⏳ Loading...</div>
          ) : (
            <>
              {groupedFarmerPayables.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4caf50', marginBottom: 8, textTransform: 'uppercase' }}>🌾 Farmer Payables</div>
                  {groupedFarmerPayables.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Total Paddy: {fmt(p.total)} | Paid: {fmt(p.paid)}</div>
                      </div>
                      <div style={{ textAlign: 'right', marginRight: 10 }}>
                        <div style={{ color: '#c62828', fontWeight: 700 }}>Due: {fmt(p.due)}</div>
                      </div>
                      <button style={S.btn('#e65100')} onClick={() => { setPayForm({ partyName: p.name, partyId: p.ids[0], partyType: 'farmer', balanceDue: p.due, amountPaying: '', paymentMode: 'cash', date: today, chequeNo: '', note: '' }); setShowModal('makePayment'); }}>Payment</button>
                    </div>
                  ))}
                </div>
              )}

              {expensePayables.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ff9800', marginBottom: 8, textTransform: 'uppercase' }}>💸 Labour / Expense Payables</div>
                  {expensePayables.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{e.type || e.expenseType || 'Expense'}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{e.date} | Total: {fmt(e.amount)}</div>
                      </div>
                      <div style={{ textAlign: 'right', marginRight: 10 }}>
                        <div style={{ color: '#c62828', fontWeight: 700 }}>Due: {fmt(toNum(e.amount) - toNum(e.amountPaid))}</div>
                      </div>
                      <button style={S.btn('#e65100')} onClick={() => { setPayForm({ partyName: e.type || e.expenseType || 'Expense', partyId: e.id, partyType: 'expense', balanceDue: toNum(e.amount) - toNum(e.amountPaid), amountPaying: '', paymentMode: 'cash', date: today, chequeNo: '', note: '' }); setShowModal('makePayment'); }}>Payment</button>
                    </div>
                  ))}
                </div>
              )}

              {gstPayable > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9c27b0', marginBottom: 8, textTransform: 'uppercase' }}>📄 GST Payable</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>GST Payable to Government</div>
                      <div style={{ fontSize: 11, color: '#888' }}>Output GST - Input GST</div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 10 }}>
                      <div style={{ color: '#c62828', fontWeight: 700 }}>{fmt(gstPayable)}</div>
                    </div>
                    <button style={S.btn('#9c27b0')} onClick={() => { setPayForm({ partyName: 'GST Payable to Government', partyId: null, partyType: 'gst', balanceDue: gstPayable, amountPaying: '', paymentMode: 'bank', date: today, chequeNo: '', note: '' }); setShowModal('makePayment'); }}>Payment</button>
                  </div>
                </div>
              )}

              {groupedFarmerPayables.length === 0 && expensePayables.length === 0 && gstPayable <= 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#4caf50', fontWeight: 600 }}>✅ Nothing pending!</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ── EXPERT MODE ───────────────────────────────────────────────────────────
  const ExpertHeader = () => (
    <div style={{ ...S.card, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e3c72', margin: 0 }}>Accounts & GST Management</h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={S.btnOutline}>📥 GST Returns</button>
          <button style={S.btnOutline}>💰 Bank Reconciliation</button>
        </div>
      </div>
    </div>
  );

  const StatsCards = () => {
    const revenue = plData ? plData.totalIncome : totalRevenue;
    const exp = plData ? plData.totalExpenditure : totalExpenses;
    const profit = plData ? plData.netProfit : netProfit;
    const gst = plData ? plData.netGST : netGST;

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Total Revenue (MTD)" value={fmt(revenue)} unit="MTD" icon={ArrowTrendingUpIcon} colorClass="text-green-600" iconBg="bg-green-50" />
        <StatCard title="Total Expenses (MTD)" value={fmt(exp)} unit="MTD" icon={ArrowTrendingDownIcon} colorClass="text-red-600" iconBg="bg-red-50" />
        <StatCard title="Net Profit (MTD)" value={fmt(profit)} unit="PROFIT" icon={BanknotesIcon} colorClass={profit >= 0 ? 'text-green-600' : 'text-red-600'} iconBg={profit >= 0 ? 'bg-green-50' : 'bg-red-50'} />
        <StatCard title="GST Liability (MTD)" value={fmt(gst)} unit="PAYABLE" icon={DocumentChartBarIcon} colorClass="text-purple-600" iconBg="bg-purple-50" />
      </div>
    );
  };

  const ExpertTabBar = () => (
    <div style={S.tabBar}>
      {[['ledger', '📚 Ledger Accounts'], ['gst', '📄 GST Reports'], ['pl', '💹 P&L Statement'], ['balance', '⚖️ Balance Sheet'], ['daybook', '📖 Day Book'], ['monthly', '📈 Monthly Profit (12M)'], ['debitnote', '📝 Debit Note'], ['creditnote', '💳 Credit Note'], ['taxinvoice', '🧾 Tax Invoice']].map(([key, label]) => (
        <button key={key} style={S.tab(expertTab === key)} onClick={() => setExpertTab(key)}>{label}</button>
      ))}
    </div>
  );

  const LedgerTab = () => (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Ledger Accounts</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select style={S.select} value={ledgerFilter} onChange={e => setLedgerFilter(e.target.value)}>
            <option>All</option><option value="assets">Assets</option><option value="income">Income</option><option value="expenses">Expenses</option><option value="debtors">Debtors</option><option value="creditors">Creditors</option>
          </select>
          <input style={{ ...S.input, width: 200 }} placeholder="Search account..." value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} />
          <button style={S.btn('#4caf50')} onClick={() => setShowModal('newAccount')}>+ New Account</button>
        </div>
      </div>
      <table style={S.table}>
        <thead><tr>{['Account Name', 'Group', 'Opening Balance', 'Debit', 'Credit', 'Closing Balance', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {filteredAccounts.map(acc => {
            const closing = toNum(acc.current_balance);
            const isDebitNature = ['assets', 'expenses', 'debtors', 'cash-in-hand', 'bank accounts'].includes((acc.group || '').toLowerCase());
            const absClosing = Math.abs(closing);
            const suffix = closing >= 0 ? (isDebitNature ? 'Dr' : 'Cr') : (isDebitNature ? 'Cr' : 'Dr');
            const color = suffix === 'Dr' ? '#2e7d32' : '#c62828';
            return (
              <tr key={acc.id} style={{ background: selectedLedger === acc.id ? '#f3f8ff' : 'white' }}>
                <td style={S.td}><strong>{acc.name}</strong>{acc.type === 'farmer' && <span style={{ color: '#4caf50', marginLeft: 5 }}>🌾</span>}</td>
                <td style={S.td}><span style={S.badge(acc.group === 'assets' ? 'blue' : acc.group === 'debtors' ? 'green' : acc.group === 'creditors' ? 'red' : 'blue')}>{acc.group.charAt(0).toUpperCase() + acc.group.slice(1)}</span></td>
                <td style={S.td}>{fmt(acc.openingBalance)}</td>
                <td style={S.td}>{fmt(acc.total_debit || 0)}</td>
                <td style={S.td}>{fmt(acc.total_credit || 0)}</td>
                <td style={{ ...S.td, fontWeight: 700, color }}>{fmt(absClosing)} {suffix}</td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={S.btn()} onClick={() => setSelectedLedger(selectedLedger === acc.id ? null : acc.id)}>View</button>
                    <button 
                      style={{ ...S.btn('#f39c12'), padding: '6px 12px' }} 
                      onClick={() => {
                        setEditingAccountId(acc.id);
                        setAccountForm({
                          name: acc.name,
                          group: acc.group_name || acc.group,
                          openingBalance: acc.opening_balance || acc.openingBalance,
                          initialDebit: '',
                          initialCredit: '',
                          closingBalance: '',
                          note: '',
                          mobile: '',
                          gstStatus: 'unregistered',
                          gstin: '',
                          address: ''
                        });
                        setShowModal('newAccount');
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {selectedLedger && (() => {
        const acc = accounts.find(a => a.id === selectedLedger);
        const txs = transactions.filter(t => t.debitAccount === acc.name || t.creditAccount === acc.name);
        return (
          <div style={{ marginTop: 20, background: '#f5f6fa', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Ledger: {acc.name}</h4>
              <button style={S.btnOutline} onClick={() => setSelectedLedger(null)}>✕ Close</button>
            </div>
            {txs.length === 0 ? <p style={{ color: '#888' }}>No transactions found.</p> : (
              <table style={S.table}>
                <thead><tr>{['Date', 'Narration', 'Debit', 'Credit'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {txs.map(t => (
                    <tr key={t.id}>
                      <td style={S.td}>{t.date}</td>
                      <td style={S.td}>{t.description}</td>
                      <td style={{ ...S.td, color: '#c62828' }}>{t.debitAccount === acc.name ? fmt(t.amount) : '-'}</td>
                      <td style={{ ...S.td, color: '#2e7d32' }}>{t.creditAccount === acc.name ? fmt(t.amount) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })()}
    </div>
  );

  const GSTTab = () => {
    const saleTxs = transactions.filter(t => t.type === 'sale');
    const purchaseTxs = transactions.filter(t => t.type === 'purchase');
    return (
      <div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <StatCard title="Total Sales" value={fmt(saleTxs.reduce((s, t) => s + t.amount, 0))} icon={ClipboardDocumentCheckIcon} colorClass="text-green-600" iconBg="bg-green-50" />
          <StatCard title="GST Collected" value={fmt(outputGST)} icon={ArrowTrendingUpIcon} colorClass="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="Total Purchases" value={fmt(purchaseTxs.reduce((s, t) => s + t.amount, 0))} icon={ScaleIcon} colorClass="text-red-600" iconBg="bg-red-50" />
          <StatCard title="GST Paid (Input)" value={fmt(inputGST)} icon={ArrowTrendingDownIcon} colorClass="text-orange-600" iconBg="bg-orange-50" />
          <StatCard title="Net GST Payable" value={fmt(netGST)} icon={DocumentChartBarIcon} colorClass="text-purple-600" iconBg="bg-purple-50" />
        </div>
        {/* ── Tax Invoice CSV Export Card ── */}
        <div style={{ ...S.card, background: 'linear-gradient(135deg, #e8f5e9 0%, #f3e5f5 100%)', border: '1.5px solid #a5d6a7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>📥</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1b5e20' }}>Download Tax Invoice Report (CSV)</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>GST Sales Register — CGST/SGST for intrastate, IGST for interstate</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>FROM DATE</label>
                <input
                  type="date" id="csv-from-date"
                  style={{ ...S.select, fontSize: 13 }}
                  value={csvFrom}
                  onChange={e => setCsvFrom(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>TO DATE</label>
                <input
                  type="date" id="csv-to-date"
                  style={{ ...S.select, fontSize: 13 }}
                  value={csvTo}
                  onChange={e => setCsvTo(e.target.value)}
                />
              </div>
              <button
                id="download-tax-invoice-csv"
                style={{ ...S.btn('#2e7d32'), padding: '10px 20px', fontSize: 14, marginTop: 16, opacity: csvLoading ? 0.7 : 1, cursor: csvLoading ? 'not-allowed' : 'pointer' }}
                onClick={downloadTaxInvoiceCSV}
                disabled={csvLoading}
              >
                {csvLoading ? '⏳ Preparing...' : '⬇️ Download CSV'}
              </button>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <h4 style={{ marginBottom: 14 }}>GSTR-1 Periodic Report (Sales Invoices)</h4>
          <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
            <table style={{ ...S.table, width: '100%', minWidth: '950px' }}>
              <thead>
                <tr>
                  {['Date', 'Invoice ID', 'Customer Name', 'GSTIN', 'Vehicle No.', 'HSN', 'Taxable Val', 'CGST', 'SGST', 'IGST', 'Grand Total'].map(h => <th key={h} style={{ ...S.th, whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {sales.length === 0
                  ? <tr><td colSpan={11} style={{ ...S.td, textAlign: 'center', color: '#888', padding: 30 }}>📭 No verified sales data for GSTR-1 yet.</td></tr>
                  : sales.map(s => (
                    <tr key={s.id} style={{ '&:hover': { backgroundColor: '#f9fafc' }}}>
                      <td style={{ ...S.td, whiteSpace: 'nowrap' }}>{s.invoiceDate ? new Date(s.invoiceDate).toLocaleDateString('en-IN') : '-'}</td>
                      <td style={{ ...S.td, color: '#1565c0', fontWeight: 600 }}>{s.invoiceNo}</td>
                      <td style={S.td}>{s.customerName}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{s.gstNumber || <span style={{ color: '#888', fontStyle: 'italic' }}>Unregistered</span>}</td>
                      <td style={S.td}>{s.vehicleNumber || <span style={{ color: '#ccc' }}>-</span>}</td>
                      <td style={S.td}>{s.hsn_sac || s.hsnSac || '1006'}</td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{fmt(s.taxable_value || s.totalAmount)}</td>
                      <td style={{ ...S.td, color: '#f57c00' }}>{fmt(s.cgst_amount || s.cgst || 0)}</td>
                      <td style={{ ...S.td, color: '#f57c00' }}>{fmt(s.sgst_amount || s.sgst || 0)}</td>
                      <td style={{ ...S.td, color: '#f57c00' }}>{fmt(s.igst_amount || 0)}</td>
                      <td style={{ ...S.td, fontWeight: 800, color: '#2e7d32' }}>{fmt(s.grandTotal)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={S.card}>
          <h4 style={{ marginBottom: 14 }}>GSTR-3B Summary</h4>
          <table style={S.table}>
            <thead><tr>{['Particulars', 'Taxable Amount', 'CGST', 'SGST', 'Total Tax'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              <tr><td style={S.td}><strong>Outward Supplies (Sales)</strong></td><td style={S.td}>{fmt(saleTxs.reduce((s, t) => s + (t.amount - (t.gst || 0)), 0))}</td><td style={S.td}>{fmt(outputGST / 2)}</td><td style={S.td}>{fmt(outputGST / 2)}</td><td style={{ ...S.td, fontWeight: 700, color: '#c62828' }}>{fmt(outputGST)}</td></tr>
              <tr><td style={S.td}><strong>Inward Supplies (Purchases)</strong></td><td style={S.td}>{fmt(purchaseTxs.reduce((s, t) => s + (t.amount - (t.gst || 0)), 0))}</td><td style={S.td}>{fmt(inputGST / 2)}</td><td style={S.td}>{fmt(inputGST / 2)}</td><td style={{ ...S.td, fontWeight: 700, color: '#2e7d32' }}>{fmt(inputGST)}</td></tr>
              <tr style={{ background: '#fff3e0' }}><td style={{ ...S.td, fontWeight: 700 }}>Net GST Payable</td><td style={S.td}></td><td style={S.td}></td><td style={S.td}></td><td style={{ ...S.td, fontWeight: 800, fontSize: 16, color: '#e65100' }}>{fmt(netGST)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const PLTab = () => {
    if (!plData) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>⏳ Fetching Profit & Loss Data...</div>;
    if (plData.error) return <div style={{ padding: 40, textAlign: 'center', color: '#c62828', fontWeight: 600 }}>⚠️ {plData.error}</div>;

    const { 
      riceSalesRevenue = 0, otherIncome = 0, totalIncome = 0, 
      paddyPurchaseCost = 0, labourWages = 0, electricityFuel = 0, 
      packagingTransport = 0, otherExpenses = 0, totalExpenditure = 0, 
      netProfit = 0, profitMargin = 0 
    } = plData;

    return (
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Profit & Loss Statement</h3>
          <select style={S.select}><option>This Financial Year</option><option>This Month</option><option>Last Month</option></select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
          <div>
            <h4 style={{ color: '#2e7d32', marginBottom: 12 }}>INCOME</h4>
            {[
              ['Rice Sales Revenue', riceSalesRevenue], 
              ['Other Income / Receipts', otherIncome]
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><span style={{ fontSize: 13 }}>{label}</span><span style={{ fontWeight: 600 }}>{fmt(val)}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #4caf50', marginTop: 4 }}><strong>Total Income</strong><strong style={{ color: '#2e7d32', fontSize: 16 }}>{fmt(totalIncome)}</strong></div>
          </div>
          <div>
            <h4 style={{ color: '#c62828', marginBottom: 12 }}>EXPENDITURE</h4>
            {[
              ['Paddy Purchase Cost', paddyPurchaseCost], 
              ['Labour & Wages', labourWages], 
              ['Electricity & Fuel', electricityFuel], 
              ['Packaging & Transport', packagingTransport], 
              ['Other Expenses', otherExpenses]
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><span style={{ fontSize: 13 }}>{label}</span><span style={{ fontWeight: 600 }}>{fmt(val)}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #c62828', marginTop: 4 }}><strong>Total Expenditure</strong><strong style={{ color: '#c62828', fontSize: 16 }}>{fmt(totalExpenditure)}</strong></div>
          </div>
        </div>
        <div style={{ background: netProfit >= 0 ? '#e8f5e9' : '#ffebee', border: `2px solid ${netProfit >= 0 ? '#4caf50' : '#c62828'}`, borderRadius: 12, padding: 20, textAlign: 'center', marginTop: 24 }}>
          <div style={{ fontSize: 13, color: '#555', fontWeight: 600, marginBottom: 6 }}>NET PROFIT</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: netProfit >= 0 ? '#2e7d32' : '#c62828' }}>{fmt(netProfit)}</div>
          <div style={{ fontSize: 13, color: '#777', marginTop: 6 }}>Profit Margin: {profitMargin}%</div>
        </div>
      </div>
    );
  };

  const DebtorsModal = ({ data, onClose }) => (
    <Modal title="📊 Top 5 Outstanding Debtors" onSave={onClose} onClose={onClose}>
      <div style={{ padding: '10px 0' }}>
        {data && data.length > 0 ? (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Customer Name</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i}>
                  <td style={S.td}><strong>{d.name}</strong></td>
                  <td style={{ ...S.td, textAlign: 'right', color: '#c62828', fontWeight: 800 }}>{fmt(d.due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>No outstanding debtors found.</div>
        )}
      </div>
    </Modal>
  );

  const BalanceTab = () => {
    if (!balanceSheet) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading Balance Sheet Data...</div>;

    const { assets, liabilities, summary } = balanceSheet;
    const isMatched = Math.abs(summary.mismatch) < 1;

    return (
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Expert Balance Sheet (Consolidated)</h3>
            <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>Calibration Mode Active — Ensuring Assets == Liabilities + Equity</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>As on Date:</label>
            <input 
              type="date" 
              style={S.select} 
              value={asOf} 
              onChange={(e) => setAsOf(e.target.value)}
            />
          </div>
        </div>

        {isMatched ? (
          <div style={{ background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#22c55e', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✓</div>
                <span style={{ fontSize: 15, color: '#166534', fontWeight: 800 }}>PERFECT BALANCE: Assets & Liabilities are Calibrated</span>
             </div>
             <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>AUDIT READY</span>
          </div>
        ) : (
          <div style={{ background: '#fff7ed', border: '2px solid #f97316', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                   <span style={{ fontSize: 15, color: '#9a3412', fontWeight: 800 }}>MISMATCH DETECTED: {fmt(summary.mismatch)}</span>
                   <p style={{ margin: 0, fontSize: 11, color: '#c2410c' }}>Check Opening Balances or missing purchase/sales entries.</p>
                </div>
             </div>
             <button style={{ ...S.btn('#f97316'), fontSize: 11, padding: '6px 12px' }} onClick={() => alert('Calibration Tip: Ensure Opening Capital (' + fmt(liabilities.openingCapital) + ') matches sum of Opening Cash, Bank, and Stock Value.')}>
                VIEW DISCREPANCY
             </button>
          </div>
        )}

        {showModal === 'debtors' && <DebtorsModal data={assets.topDebtors} onClose={() => setShowModal(null)} />}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {/* ASSETS SIDE */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #4caf50', paddingBottom: 8, marginBottom: 16 }}>
              <h4 style={{ color: '#2e7d32', margin: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Assets</h4>
              <span style={{ fontSize: 11, color: '#888', fontWeight: 700 }}>WHERE THE MONEY IS</span>
            </div>
            
            <div style={{ display: 'grid', gap: 4 }}>
              {assets.cashBank.map(cb => (
                <div key={cb.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => { setExpertTab('ledger'); setLedgerSearch(cb.name); }}>
                  <span style={{ color: '#475569', fontWeight: 500 }}>{cb.name}</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{fmt(cb.balance)}</span>
                </div>
              ))}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13, cursor: 'help' }} title="Inventory = Current Weight * Last Purchase Price">
                <span style={{ color: '#475569', fontWeight: 500 }}>Paddy/Rice Stock (Real-time Value)</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{fmt(assets.stockValue)}</span>
              </div>

              <div 
                style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13, cursor: 'pointer', background: '#f8fafc', borderRadius: 8, marginTop: 4, border: '1px dashed #cbd5e1' }} 
                onClick={() => setShowModal('debtors')}
                title="Click to view Top Debtors"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                   <span style={{ fontSize: 16 }}>👥</span>
                   <span style={{ color: '#0f172a', fontWeight: 700 }}>Accounts Receivable</span>
                </div>
                <span style={{ fontWeight: 900, color: '#2e7d32', fontSize: 14 }}>{fmt(assets.accountsReceivable)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 14px', borderTop: '4px double #4caf50', marginTop: 12 }}>
              <strong style={{ fontSize: 16, textTransform: 'uppercase', color: '#334155' }}>Total Assets</strong>
              <strong style={{ color: '#166534', fontSize: 20, fontWeight: 900 }}>{fmt(summary.totalAssets)}</strong>
            </div>
          </div>

          {/* LIABILITIES SIDE */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #ef4444', paddingBottom: 8, marginBottom: 16 }}>
              <h4 style={{ color: '#b91c1c', margin: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Liabilities & Equity</h4>
              <span style={{ fontSize: 11, color: '#888', fontWeight: 700 }}>WHAT WE OWE</span>
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13, cursor: 'pointer' }}
                onClick={() => { setMode('simple'); }}
              >
                <span style={{ color: '#475569', fontWeight: 500 }}>Accounts Payable (Farmers/Suppliers)</span>
                <span style={{ fontWeight: 800, color: '#991b1b' }}>{fmt(liabilities.accountsPayable)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13, cursor: 'pointer' }} onClick={() => setExpertTab('gst')}>
                <span style={{ color: '#475569', fontWeight: 500 }}>GST Provision (Net Liability)</span>
                <span style={{ fontWeight: 800, color: '#991b1b' }}>{fmt(liabilities.gstPayable)}</span>
              </div>

              <div style={{ marginTop: 20, padding: '16px', background: '#f1f5f9', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.1em' }}>Equity & Retained Earnings</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
                  <span style={{ color: '#334155', fontWeight: 500 }}>Opening Capital</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmt(liabilities.openingCapital)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, cursor: 'pointer', borderTop: '1px dashed #cbd5e1', marginTop: 4, paddingTop: 10 }} onClick={() => setExpertTab('pl')}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Accumulated Net Profit</span>
                  <span style={{ fontWeight: 900, color: liabilities.netProfit >= 0 ? '#166534' : '#991b1b' }}>
                    {liabilities.netProfit >= 0 ? '+' : ''}{fmt(liabilities.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 14px', borderTop: '4px double #ef4444', marginTop: 12 }}>
              <strong style={{ fontSize: 16, textTransform: 'uppercase', color: '#334155' }}>Total Equities</strong>
              <strong style={{ color: '#991b1b', fontSize: 20, fontWeight: 900 }}>{fmt(summary.totalLiabilities)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DayBookTab = () => {
    const dayTxs = transactions.filter(t => t.date === dayBookDate);
    const totalDr = dayTxs.filter(t => ['purchase', 'expense'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
    const totalCr = dayTxs.filter(t => ['sale', 'receipt'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
    const typeLabel = { sale: 'Rice Sale', purchase: 'Paddy Purchase', expense: 'Expense', receipt: 'Receipt' };
    return (
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Day Book</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={S.btnOutline} onClick={() => { const d = new Date(dayBookDate); d.setDate(d.getDate() - 1); setDayBookDate(d.toISOString().split('T')[0]); }}>◀ Prev</button>
            <input type="date" style={S.select} value={dayBookDate} onChange={e => setDayBookDate(e.target.value)} />
            <button style={S.btnOutline} onClick={() => { const d = new Date(dayBookDate); d.setDate(d.getDate() + 1); setDayBookDate(d.toISOString().split('T')[0]); }}>Next ▶</button>
          </div>
        </div>
        {dayTxs.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>📭 No transactions on this date</div>
          : <>
            <table style={S.table}>
              <thead><tr>{['Time', 'Type', 'Party', 'Narration', 'Debit (Dr)', 'Credit (Cr)'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {dayTxs.map(t => (
                  <tr key={t.id}>
                    <td style={S.td}>{t.time || '--:--'}</td>
                    <td style={S.td}><span style={S.badge(['sale', 'receipt'].includes(t.type) ? 'green' : 'red')}>{typeLabel[t.type] || t.type}</span></td>
                    <td style={S.td}>{t.party}</td>
                    <td style={S.td}>{t.description}</td>
                    <td style={{ ...S.td, color: '#c62828', fontWeight: 600 }}>{['purchase', 'expense'].includes(t.type) ? fmt(t.amount) : '-'}</td>
                    <td style={{ ...S.td, color: '#2e7d32', fontWeight: 600 }}>{['sale', 'receipt'].includes(t.type) ? fmt(t.amount) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f5f6fa', fontWeight: 700 }}>
                  <td colSpan={4} style={S.td}>Day Totals</td>
                  <td style={{ ...S.td, color: '#c62828', fontSize: 15 }}>{fmt(totalDr)}</td>
                  <td style={{ ...S.td, color: '#2e7d32', fontSize: 15 }}>{fmt(totalCr)}</td>
                </tr>
              </tfoot>
            </table>
            {totalDr !== totalCr && <div style={{ marginTop: 12, background: '#fff3e0', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#e65100' }}>⚠️ Debit ≠ Credit — please check entries</div>}
          </>
        }
      </div>
    );
  };

  const MonthlyTab = () => {
    const best = [...monthlyData].sort((a, b) => b.profit - a.profit)[0];
    const worst = [...monthlyData].sort((a, b) => a.profit - b.profit)[0];
    const avg = monthlyData.reduce((s, m) => s + m.profit, 0) / monthlyData.length;
    return (
      <div style={S.card}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>Monthly Profit — Last 12 Months</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginBottom: 20, padding: '0 4px' }}>
          {monthlyData.map(m => {
            const maxVal = Math.max(...monthlyData.map(x => Math.abs(x.profit)), 1);
            const h = Math.round((Math.abs(m.profit) / maxVal) * 100);
            return (
              <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: `${h}%`, background: m.profit >= 0 ? '#4caf50' : '#f44336', borderRadius: '4px 4px 0 0', minHeight: 4 }} title={`${m.month}: ${fmt(m.profit)}`} />
                <div style={{ fontSize: 9, color: '#888', textAlign: 'center' }}>{m.month.split(' ')[0]}</div>
              </div>
            );
          })}
        </div>
        <table style={S.table}>
          <thead><tr>{['Month', 'Total Sales', 'Total Expenses', 'Net Profit', 'Margin%'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {monthlyData.map(m => {
              const margin = m.sales > 0 ? ((m.profit / m.sales) * 100).toFixed(1) : 0;
              return (
                <tr key={m.key}>
                  <td style={S.td}>{m.month}</td>
                  <td style={{ ...S.td, color: '#2e7d32', fontWeight: 600 }}>{m.sales > 0 ? fmt(m.sales) : '—'}</td>
                  <td style={{ ...S.td, color: '#c62828', fontWeight: 600 }}>{m.expenses > 0 ? fmt(m.expenses) : '—'}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: m.profit >= 0 ? '#2e7d32' : '#c62828' }}>{m.sales > 0 || m.expenses > 0 ? fmt(m.profit) : '—'}</td>
                  <td style={S.td}>{m.sales > 0 ? `${margin}%` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 20 }}>
          {[['🏆 Best Month', best?.month, '#2e7d32'], ['📉 Worst Month', worst?.month, '#c62828'], ['📊 Avg Monthly', fmt(avg), '#1565c0']].map(([label, val, color]) => (
            <div key={label} style={{ background: '#f5f6fa', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DebitNoteTab = () => (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Debit Note</h3>
        <button style={S.btn('#4caf50')} onClick={() => { setDebitNoteForm({ ...emptyDebitNote, noteNo: `DN-${debitNotes.length + 1001}` }); setShowModal('debitNote'); }}>+ New Debit Note</button>
      </div>
      {debitNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>📭 No Debit Notes recorded yet</div>
      ) : (
        <table style={S.table}>
          <thead><tr>{['Note No', 'Date', 'Customer Name', 'Item Name', 'Amount', 'Note'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {debitNotes.map(n => (
              <tr key={n.id}>
                <td style={S.td}><strong>{n.noteNo}</strong></td>
                <td style={S.td}>{n.date}</td>
                <td style={S.td}>{n.customer}</td>
                <td style={S.td}>{n.item}</td>
                <td style={{ ...S.td, fontWeight: 700, color: '#c62828' }}>{fmt(n.amount)}</td>
                <td style={{ ...S.td, color: '#888' }}>{n.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const CreditNoteTab = () => (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Credit Note</h3>
        <button style={S.btn('#4caf50')} onClick={() => { setCreditNoteForm({ ...emptyCreditNote, noteNo: `CN-${creditNotes.length + 1001}` }); setShowModal('creditNote'); }}>+ New Credit Note</button>
      </div>
      {creditNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>📭 No Credit Notes recorded yet</div>
      ) : (
        <table style={S.table}>
          <thead><tr>{['Note No', 'Date', 'Customer Name', 'Item Name', 'Amount'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {creditNotes.map(n => (
              <tr key={n.id}>
                <td style={S.td}><strong>{n.noteNo}</strong></td>
                <td style={S.td}>{n.date}</td>
                <td style={S.td}>{n.customer}</td>
                <td style={S.td}>{n.item}</td>
                <td style={{ ...S.td, fontWeight: 700, color: '#2e7d32' }}>{fmt(n.amount)}</td>
                <td style={{ ...S.td, color: '#888' }}>{n.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const getDynamicFY = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1 to 12
    const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    return `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
  };

  const TaxInvoiceTab = () => {
    const handleDownloadCSV = () => {
      if (!sales.length) { showToast('No invoice data to export', 'error'); return; }

      const toNum = (v) => Number(v || 0).toFixed(2);
      const escapeCell = (v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? '"' + s.replace(/"/g, '""') + '"'
          : s;
      };

      const headers = [
        'Invoice No', 'Date', 'Customer Name', 'GSTIN',
        'Vehicle No', 'HSN/SAC',
        'Taxable Value', 'CGST', 'SGST', 'IGST', 'Grand Total'
      ];

      const rows = sales.map(s => [
        escapeCell(s.invoiceNo),
        escapeCell(s.invoiceDate ? new Date(s.invoiceDate).toLocaleDateString('en-IN') : ''),
        escapeCell(s.customerName),
        escapeCell(s.gstNumber || 'Unregistered'),
        escapeCell(s.vehicleNumber || ''),
        escapeCell(s.hsn_sac || s.hsnSac || '1006'),
        toNum(s.taxable_value || s.totalAmount),
        toNum(s.cgst_amount),
        toNum(s.sgst_amount),
        toNum(s.igst_amount),
        toNum(s.grandTotal),
      ].join(','));

      const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const monthName = now.toLocaleString('en-IN', { month: 'long' });
      const link = document.createElement('a');
      link.href = url;
      link.download = `GST_Sales_Register_${monthName}_${now.getFullYear()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`✓ CSV exported — ${sales.length} invoice(s)`);
    };

    return (
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>GST Tax Invoices Register (FY {getDynamicFY()})</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              id="download-gst-register-csv"
              style={{ ...S.btnOutline, display: 'flex', alignItems: 'center', gap: 6, borderColor: '#546e7a', color: '#37474f', background: '#eceff1' }}
              onClick={handleDownloadCSV}
            >
              <span style={{ fontSize: 15 }}>⬇️</span> Download CSV
            </button>
            <button
              style={S.btn('#4caf50')}
              onClick={() => alert('Please navigate to Sales module to generate new formal Tax Invoices.')}
            >
              + Create Tax Invoice
            </button>
          </div>
        </div>
        {sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>📭 No Tax Invoices generated yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...S.table, width: '100%', minWidth: '1000px' }}>
              <thead>
                <tr>
                  {['Invoice No', 'Date', 'Customer Name', 'GSTIN', 'Vehicle No', 'HSN', 'Taxable Val', 'CGST', 'SGST', 'IGST', 'Grand Total'].map((h, i) => (
                    <th key={h} style={{ ...S.th, whiteSpace: 'nowrap', textAlign: i >= 6 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td style={{ ...S.td, color: '#1565c0', whiteSpace: 'nowrap' }}><strong>{s.invoiceNo}</strong></td>
                    <td style={{ ...S.td, whiteSpace: 'nowrap' }}>{s.invoiceDate ? new Date(s.invoiceDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={S.td}>{s.customerName}</td>
                    <td style={{ ...S.td, fontSize: 12 }}>{s.gstNumber || <span style={{ color: '#888', fontStyle: 'italic' }}>Unregistered</span>}</td>
                    <td style={{ ...S.td, whiteSpace: 'nowrap', color: '#555' }}>{s.vehicleNumber || '-'}</td>
                    <td style={{ ...S.td, fontWeight: 500 }}>{s.hsn_sac || s.hsnSac || '1006'}</td>
                    <td style={{ ...S.td, fontWeight: 600, textAlign: 'right' }}>{fmt(s.taxable_value || s.totalAmount)}</td>
                    <td style={{ ...S.td, color: '#f57c00', fontWeight: 600, textAlign: 'right' }}>{fmt(s.cgst_amount || 0)}</td>
                    <td style={{ ...S.td, color: '#f57c00', fontWeight: 600, textAlign: 'right' }}>{fmt(s.sgst_amount || 0)}</td>
                    <td style={{ ...S.td, color: '#f57c00', fontWeight: 600, textAlign: 'right' }}>{fmt(s.igst_amount || 0)}</td>
                    <td style={{ ...S.td, fontWeight: 800, color: '#2e7d32', textAlign: 'right' }}>{fmt(s.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-2xl text-white font-black text-sm shadow-2xl animate-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-500 shadow-rose-200'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">Accounts & GST Ledger</h1>
          <p className="text-sm text-slate-500 mt-1 italic font-medium">Financial Year 2026-27 — Receivables, Payables &amp; GST Management</p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-900 px-5 py-3 rounded-2xl font-black hover:bg-slate-50 transition-all shadow-sm transform active:scale-95 uppercase text-[10px] tracking-widest"
          onClick={() => { setMode(mode === 'simple' ? 'expert' : 'simple'); setExpertTab('ledger'); }}
        >
          {mode === 'simple' ? '📊 Expert Mode' : '⬅ Simple Mode'}
        </button>
      </div>

      {mode === 'expert' && (
        <div>
          <ExpertHeader />
          <StatsCards />
          <ExpertTabBar />
          {expertTab === 'ledger' && <LedgerTab />}
          {expertTab === 'gst' && <GSTTab />}
          {expertTab === 'pl' && <PLTab />}
          {expertTab === 'balance' && <BalanceTab />}
          {expertTab === 'daybook' && <DayBookTab />}
          {expertTab === 'monthly' && <MonthlyTab />}
          {expertTab === 'debitnote' && <DebitNoteTab />}
          {expertTab === 'creditnote' && <CreditNoteTab />}
          {expertTab === 'taxinvoice' && <TaxInvoiceTab />}
        </div>
      )}

      {mode === 'simple' && <SimpleMode />}

      {showModal === 'paddy' && (
        <Modal title="📦 Paddy Purchase" onSave={handlePaddyPurchase} onClose={() => setShowModal(null)}>
          <Field label="Farmer Name"><select style={S.input} value={paddyForm.farmer} onChange={e => setPaddyForm({ ...paddyForm, farmer: e.target.value })}><option value="">Select Farmer</option>{farmers.map(f => <option key={f}>{f}</option>)}</select></Field>
          <Field label="Date"><input type="date" style={S.input} value={paddyForm.date} onChange={e => setPaddyForm({ ...paddyForm, date: e.target.value })} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Quantity (KG)"><input type="number" style={S.input} placeholder="0" value={paddyForm.kg} onChange={e => setPaddyForm({ ...paddyForm, kg: e.target.value })} /></Field>
            <Field label="Rate per KG (₹)"><input type="number" style={S.input} placeholder="0" value={paddyForm.rate} onChange={e => setPaddyForm({ ...paddyForm, rate: e.target.value })} /></Field>
          </div>
          <div style={{ background: '#f5f6fa', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span>Amount:</span><strong>{fmt(paddyTotal)}</strong></div>
            {paddyForm.gstEnabled && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span>GST:</span><strong>{fmt(paddyGST)}</strong></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: 8, fontWeight: 800, fontSize: 15 }}><span>Grand Total:</span><span style={{ color: '#1e3c72' }}>{fmt(paddyGrand)}</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={paddyForm.gstEnabled} onChange={e => setPaddyForm({ ...paddyForm, gstEnabled: e.target.checked })} />
            <span style={{ fontSize: 13 }}>Apply GST</span>
            {paddyForm.gstEnabled && <select style={{ ...S.select, marginLeft: 8 }} value={paddyForm.gstPercent} onChange={e => setPaddyForm({ ...paddyForm, gstPercent: e.target.value })}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option></select>}
          </div>
          <Field label="Payment Method">
            <div style={{ display: 'flex', gap: 8 }}>
              {['cash', 'bank', 'udhaar'].map(m => <button key={m} onClick={() => setPaddyForm({ ...paddyForm, payment: m })} style={{ ...S.btn(paddyForm.payment === m ? '#4caf50' : '#e0e0e0'), color: paddyForm.payment === m ? 'white' : '#333', padding: '7px 16px' }}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>)}
            </div>
          </Field>
          <Field label="Note"><textarea style={{ ...S.input, minHeight: 50, resize: 'vertical' }} placeholder="Optional..." value={paddyForm.note} onChange={e => setPaddyForm({ ...paddyForm, note: e.target.value })} /></Field>
        </Modal>
      )}

      {showModal === 'rice' && (
        <Modal title="🌾 Rice Sale" onSave={handleRiceSale} onClose={() => setShowModal(null)}>
          <Field label="Customer Name"><select style={S.input} value={riceForm.customer} onChange={e => setRiceForm({ ...riceForm, customer: e.target.value })}><option value="">Select Customer</option>{customers.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Date"><input type="date" style={S.input} value={riceForm.date} onChange={e => setRiceForm({ ...riceForm, date: e.target.value })} /></Field>
          <Field label="Rice Type"><select style={S.input} value={riceForm.riceType} onChange={e => setRiceForm({ ...riceForm, riceType: e.target.value })}><option value="boiled">Boiled Rice</option><option value="raw">Raw Rice</option><option value="broken">Broken Rice</option><option value="husk">Husk</option></select></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Quantity"><input type="number" style={S.input} placeholder="0" value={riceForm.quantity} onChange={e => setRiceForm({ ...riceForm, quantity: e.target.value })} /></Field>
            <Field label="Unit"><div style={{ display: 'flex', gap: 8 }}>{['bags', 'kg'].map(u => <button key={u} onClick={() => setRiceForm({ ...riceForm, unit: u })} style={{ ...S.btn(riceForm.unit === u ? '#1565c0' : '#e0e0e0'), color: riceForm.unit === u ? 'white' : '#333', padding: '7px 14px' }}>{u.toUpperCase()}</button>)}</div></Field>
          </div>
          <Field label="Rate per unit (₹)"><input type="number" style={S.input} placeholder="0" value={riceForm.rate} onChange={e => setRiceForm({ ...riceForm, rate: e.target.value })} /></Field>
          <div style={{ background: '#f5f6fa', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span>Amount:</span><strong>{fmt(riceTotal)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span>GST ({riceForm.gstPercent}%):</span><strong>{fmt(riceGST)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: 8, fontWeight: 800, fontSize: 15 }}><span>Grand Total:</span><span style={{ color: '#1e3c72' }}>{fmt(riceGrand)}</span></div>
          </div>
          <Field label="GST %"><select style={S.input} value={riceForm.gstPercent} onChange={e => setRiceForm({ ...riceForm, gstPercent: e.target.value })}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option></select></Field>
          <Field label="Payment"><div style={{ display: 'flex', gap: 8 }}>{['cash', 'bank', 'udhaar'].map(m => <button key={m} onClick={() => setRiceForm({ ...riceForm, payment: m })} style={{ ...S.btn(riceForm.payment === m ? '#4caf50' : '#e0e0e0'), color: riceForm.payment === m ? 'white' : '#333', padding: '7px 16px' }}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>)}</div></Field>
        </Modal>
      )}

      {showModal === 'receipt' && (
        <Modal title="💰 Receipt Entry" onSave={handleReceipt} onClose={() => setShowModal(null)}>
          <Field label="Receipt No."><input type="text" style={{ ...S.input, background: '#f5f6fa', fontWeight: 'bold' }} placeholder="REC-001" value={receiptForm.receiptNo} onChange={e => setReceiptForm({ ...receiptForm, receiptNo: e.target.value })} /></Field>
          <Field label="Received From"><select style={S.input} value={receiptForm.from} onChange={e => setReceiptForm({ ...receiptForm, from: e.target.value })}><option value="">Select Party</option>{[...customers, ...farmers].map(p => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Amount (₹)"><input type="number" style={S.input} placeholder="0" value={receiptForm.amount} onChange={e => setReceiptForm({ ...receiptForm, amount: e.target.value })} /></Field>
          <Field label="Method"><div style={{ display: 'flex', gap: 8 }}>{['cash', 'bank', 'upi'].map(m => <button key={m} onClick={() => setReceiptForm({ ...receiptForm, method: m })} style={{ ...S.btn(receiptForm.method === m ? '#4caf50' : '#e0e0e0'), color: receiptForm.method === m ? 'white' : '#333', padding: '7px 16px' }}>{m.toUpperCase()}</button>)}</div></Field>
          <Field label="Date"><input type="date" style={S.input} value={receiptForm.date} onChange={e => setReceiptForm({ ...receiptForm, date: e.target.value })} /></Field>
          <Field label="Note"><input type="text" style={S.input} placeholder="Cheque no / UTR..." value={receiptForm.note} onChange={e => setReceiptForm({ ...receiptForm, note: e.target.value })} /></Field>
        </Modal>
      )}

      {showModal === 'expense' && (
        <Modal title="💸 Expense Entry" onSave={handleExpense} onClose={() => setShowModal(null)}>
          <Field label="Expense Type"><select style={S.input} value={expenseForm.type} onChange={e => setExpenseForm({ ...expenseForm, type: e.target.value })}><option value="labour">Labour</option><option value="bijli">Electricity (Bijli)</option><option value="machine">Machine Repair</option><option value="transport">Transport</option><option value="diesel">Diesel</option><option value="gunny">Gunny Bags</option><option value="other">Other</option></select></Field>
          <Field label="Amount (₹)"><input type="number" style={S.input} placeholder="0" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></Field>
          <Field label="Payment Method"><div style={{ display: 'flex', gap: 8 }}>{['cash', 'bank'].map(m => <button key={m} onClick={() => setExpenseForm({ ...expenseForm, method: m })} style={{ ...S.btn(expenseForm.method === m ? '#4caf50' : '#e0e0e0'), color: expenseForm.method === m ? 'white' : '#333', padding: '7px 16px' }}>{m.toUpperCase()}</button>)}</div></Field>
          <Field label="Date"><input type="date" style={S.input} value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} /></Field>
          <Field label="Note"><textarea style={{ ...S.input, minHeight: 50, resize: 'vertical' }} placeholder="Optional..." value={expenseForm.note} onChange={e => setExpenseForm({ ...expenseForm, note: e.target.value })} /></Field>
        </Modal>
      )}

      {showModal === 'receivePayment' && (
        <Modal title="💰 Receive Payment" onSave={handleReceivePayment} onClose={() => setShowModal(null)}>
          <Field label="Customer Name"><input type="text" style={{ ...S.input, background: '#f5f5f5' }} value={receiveForm.customerName} readOnly /></Field>
          <Field label="Invoice No"><input type="text" style={{ ...S.input, background: '#f5f5f5' }} value={receiveForm.invoiceNo} readOnly /></Field>
          <Field label="Total Balance Due"><input type="text" style={{ ...S.input, background: '#fff3e0', fontWeight: 700, color: '#c62828' }} value={fmt(receiveForm.totalBalanceDue)} readOnly /></Field>
          <Field label="Amount Receiving (₹)"><input type="number" style={S.input} value={receiveForm.amountReceiving} onChange={e => setReceiveForm({ ...receiveForm, amountReceiving: e.target.value })} placeholder="Enter amount" max={receiveForm.totalBalanceDue} /></Field>
          <Field label="Payment Mode">
            <div style={{ display: 'flex', gap: 8 }}>
              {['cash', 'bank', 'upi'].map(m => <button key={m} onClick={() => setReceiveForm({ ...receiveForm, paymentMode: m })} style={{ ...S.btn(receiveForm.paymentMode === m ? '#4caf50' : '#e0e0e0'), color: receiveForm.paymentMode === m ? 'white' : '#333', padding: '7px 16px' }}>{m.toUpperCase()}</button>)}
            </div>
          </Field>
          <Field label="Date"><input type="date" style={S.input} value={receiveForm.date} onChange={e => setReceiveForm({ ...receiveForm, date: e.target.value })} /></Field>
          <Field label="Note"><textarea style={{ ...S.input, minHeight: 50, resize: 'vertical' }} placeholder="Optional..." value={receiveForm.note} onChange={e => setReceiveForm({ ...receiveForm, note: e.target.value })} /></Field>
        </Modal>
      )}

      {showModal === 'makePayment' && (
        <Modal title="💸 Make Payment" onSave={handleMakePayment} onClose={() => setShowModal(null)}>
          <Field label="Party Name"><input type="text" style={{ ...S.input, background: '#f5f5f5' }} value={payForm.partyName} readOnly /></Field>
          <Field label="Balance Due"><input type="text" style={{ ...S.input, background: '#fff3e0', fontWeight: 700, color: '#c62828' }} value={fmt(payForm.balanceDue)} readOnly /></Field>
          <Field label="Amount Paying (₹)"><input type="number" style={S.input} value={payForm.amountPaying} onChange={e => setPayForm({ ...payForm, amountPaying: e.target.value })} placeholder="Enter amount" max={payForm.balanceDue} /></Field>
          <Field label="Payment Mode">
            <div style={{ display: 'flex', gap: 8 }}>
              {['cash', 'bank', 'upi', 'cheque'].map(m => <button key={m} onClick={() => setPayForm({ ...payForm, paymentMode: m })} style={{ ...S.btn(payForm.paymentMode === m ? '#e65100' : '#e0e0e0'), color: payForm.paymentMode === m ? 'white' : '#333', padding: '7px 16px' }}>{m.toUpperCase()}</button>)}
            </div>
          </Field>
          {payForm.paymentMode === 'cheque' && <Field label="Cheque No"><input type="text" style={S.input} value={payForm.chequeNo} onChange={e => setPayForm({ ...payForm, chequeNo: e.target.value })} placeholder="Enter cheque number" /></Field>}
          <Field label="Date"><input type="date" style={S.input} value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} /></Field>
          <Field label="Note"><textarea style={{ ...S.input, minHeight: 50, resize: 'vertical' }} placeholder="Optional..." value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} /></Field>
        </Modal>
      )}


      {showModal === 'newAccount' && (
        <Modal 
          title={editingAccountId ? "🏦 Edit Ledger Account" : "🏦 Add Ledger Account"} 
          onSave={handleNewAccount} 
          onClose={() => { setShowModal(null); setEditingAccountId(null); setAccountForm(emptyAccount); }}
        >
          <Field label="Account Name">
            <input type="text" style={S.input} placeholder="e.g. HDFC Bank, Shyam Lal" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} />
          </Field>
          <Field label="Group">
            <select style={S.input} value={accountForm.group} onChange={e => setAccountForm({ ...accountForm, group: e.target.value })}>
              <option value="assets">Assets (Cash, Bank)</option>
              <option value="debtors">Debtors (Customers)</option>
              <option value="creditors">Creditors (Suppliers)</option>
              <option value="income">Income</option>
              <option value="expenses">Expenses</option>
            </select>
          </Field>
          
          {!editingAccountId && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Mobile Number">
                  <input type="text" style={S.input} placeholder="10-digit mobile" value={accountForm.mobile} onChange={e => setAccountForm({ ...accountForm, mobile: e.target.value })} />
                </Field>
                <Field label="GST Status">
                  <select style={S.input} value={accountForm.gstStatus} onChange={e => setAccountForm({ ...accountForm, gstStatus: e.target.value })}>
                    <option value="unregistered">Unregistered</option>
                    <option value="registered">Registered</option>
                  </select>
                </Field>
              </div>
              {accountForm.gstStatus === 'registered' && (
                <Field label="GSTIN">
                  <input type="text" style={S.input} placeholder="e.g. 22AAAAA0000A1Z5" value={accountForm.gstin} onChange={e => setAccountForm({ ...accountForm, gstin: e.target.value })} />
                </Field>
              )}
              <Field label="Address">
                <textarea style={{ ...S.input, minHeight: 40, resize: 'vertical' }} placeholder="Full address..." value={accountForm.address} onChange={e => setAccountForm({ ...accountForm, address: e.target.value })} />
              </Field>
            </>
          )}
          
          <Field label="Opening Balance (₹)">
            <input type="number" style={S.input} placeholder="0" value={accountForm.openingBalance} onChange={e => setAccountForm({ ...accountForm, openingBalance: e.target.value })} />
          </Field>
          
          <Field label="Note">
            <input type="text" style={S.input} placeholder="Optional setup note..." value={accountForm.note} onChange={e => setAccountForm({ ...accountForm, note: e.target.value })} />
          </Field>
        </Modal>
      )}

      {showModal === 'debitNote' && (
        <Modal title="📝 New Debit Note" onSave={handleDebitNote} onClose={() => setShowModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Debit Note No."><input type="text" style={S.input} value={debitNoteForm.noteNo} onChange={e => setDebitNoteForm({ ...debitNoteForm, noteNo: e.target.value })} /></Field>
            <Field label="Date"><input type="date" style={S.input} value={debitNoteForm.date} onChange={e => setDebitNoteForm({ ...debitNoteForm, date: e.target.value })} /></Field>
          </div>
          <Field label="Customer Name">
            <input type="text" style={S.input} placeholder="Select or enter customer" list="dn-customers" value={debitNoteForm.customer} onChange={e => setDebitNoteForm({ ...debitNoteForm, customer: e.target.value })} />
            <datalist id="dn-customers">{customers.map(c => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Item Name"><input type="text" style={S.input} placeholder="Reason or Item Name" value={debitNoteForm.item} onChange={e => setDebitNoteForm({ ...debitNoteForm, item: e.target.value })} /></Field>
          <Field label="Amount (₹)"><input type="number" style={S.input} placeholder="0" value={debitNoteForm.amount} onChange={e => setDebitNoteForm({ ...debitNoteForm, amount: e.target.value })} /></Field>
          <Field label="Note"><input type="text" style={S.input} placeholder="Optional notes..." value={debitNoteForm.note} onChange={e => setDebitNoteForm({ ...debitNoteForm, note: e.target.value })} /></Field>
        </Modal>
      )}

      {showModal === 'creditNote' && (
        <Modal title="💳 New Credit Note" onSave={handleCreditNote} onClose={() => setShowModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Credit Note No."><input type="text" style={S.input} value={creditNoteForm.noteNo} onChange={e => setCreditNoteForm({ ...creditNoteForm, noteNo: e.target.value })} /></Field>
            <Field label="Date"><input type="date" style={S.input} value={creditNoteForm.date} onChange={e => setCreditNoteForm({ ...creditNoteForm, date: e.target.value })} /></Field>
          </div>
          <Field label="Customer Name">
            <input type="text" style={S.input} placeholder="Select or enter customer" list="cn-customers" value={creditNoteForm.customer} onChange={e => setCreditNoteForm({ ...creditNoteForm, customer: e.target.value })} />
            <datalist id="cn-customers">{customers.map(c => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Item Name"><input type="text" style={S.input} placeholder="Reason or Item Name" value={creditNoteForm.item} onChange={e => setCreditNoteForm({ ...creditNoteForm, item: e.target.value })} /></Field>
          <Field label="Amount (₹)"><input type="number" style={S.input} placeholder="0" value={creditNoteForm.amount} onChange={e => setCreditNoteForm({ ...creditNoteForm, amount: e.target.value })} /></Field>
          <Field label="Note"><input type="text" style={S.input} placeholder="Optional notes..." value={creditNoteForm.note} onChange={e => setCreditNoteForm({ ...creditNoteForm, note: e.target.value })} /></Field>
        </Modal>
      )}
    </PageContainer>
  );
}

export default AccountsPage;

