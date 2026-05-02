import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  ArrowLeftIcon,
  TrashIcon,
  TagIcon,
  CreditCardIcon,
  BanknotesIcon,
  ChartPieIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import authFetch from '../utils/authFetch';
import { fetchExpenses, saveExpense, deleteExpense as deleteExpApi } from '../api/api';
import StatCard from '../components/ui/StatCard';
import { PageContainer, SectionCard, ModernTable } from '../components/ui/Layout';

const CATEGORY_ICONS = {
  'Labour Wages': UsersIcon,
  'Electricity Bill': BoltIcon,
  'Machine Maintenance': WrenchScrewdriverIcon,
  'Transport Charges': TruckIcon,
  'Miscellaneous': TagIcon,
};

const CATEGORY_COLORS = [
  'bg-indigo-600',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
];

function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [expenseType, setExpenseType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const CATEGORY_MAPPING = {
    'Direct Expense': [
      'Paddy Purchase', 'Labor Wages (Milling)', 'Factory Electricity/Power', 
      'Freight Inward (Transporting Paddy)', 'Rice Bag/Packaging Material', 
      'Machine Maintenance (Direct)', 'Fuel for Generator (Factory)'
    ],
    'Indirect Expense': [
      'Office Salaries', 'Marketing & Cold Calling', 'Office Rent', 
      'Printing & Stationery', 'Communication/Internet', 'Professional Fees (Accounting/Legal)', 
      'Travel Expenses (Sales)', 'Bank Charges', 'Staff Welfare/Tea', 'Miscellaneous'
    ]
  };

  const ALL_CATEGORIES = [
    ...CATEGORY_MAPPING['Direct Expense'],
    ...CATEGORY_MAPPING['Indirect Expense']
  ].sort();

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    if (!cat) {
      setExpenseType('');
      return;
    }
    const isDirect = CATEGORY_MAPPING['Direct Expense'].includes(cat);
    setExpenseType(isDirect ? 'Direct Expense' : 'Indirect Expense');
  };

  const categoryTotals = expenses.reduce((acc, exp) => {
    const cat = exp.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  const totalExpense = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  const breakdownCards = Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name, amount, percent: totalExpense ? Math.round((amount / totalExpense) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch expenses', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDeleteExpense = async (exp) => {
    const isConfirmed = window.confirm(
      `⚠️ WARNING: DELETE EXPENSE\n\n` +
      `Are you sure you want to PERMANENTLY delete this expense record?\n\n` +
      `Category: ${exp.category}\nPaid To: ${exp.paidTo}\nAmount: ₹${Number(exp.amount).toLocaleString()}\n\nTHIS ACTION CANNOT BE UNDONE.`
    );
    if (!isConfirmed) return;
    try {
      await deleteExpApi(exp._id);
      alert('Expense record deleted successfully.');
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete expense.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      date: document.getElementById('expenseDate')?.value || null,
      category: selectedCategory,
      expenseType: expenseType,
      paidTo: document.getElementById('paidTo')?.value || null,
      amount: parseFloat(document.getElementById('amount')?.value || '0') || 0,
      paymentMode: document.getElementById('paymentMode')?.value || 'Cash',
      remarks: document.getElementById('remarks')?.value || null,
    };
    try {
      const data = await saveExpense(payload);
      alert('Expense saved: ₹' + data.amount);
      loadData();
      setView('list');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save expense.');
    }
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">Expense Management</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium italic">Track operational costs, labour, utilities, and overhead.</p>
        </div>
        <button
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-black transition-all shadow-xl transform active:scale-95 uppercase text-xs tracking-widest ${
            view === 'form'
              ? 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 shadow-sm'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
          }`}
          onClick={() => setView(view === 'form' ? 'list' : 'form')}
        >
          {view === 'form' ? <><ArrowLeftIcon className="h-5 w-5" /> Back to List</> : <><PlusIcon className="h-5 w-5" /> Add Expense</>}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Expenses"
          value={'₹' + (totalExpense / 1000).toFixed(1) + 'K'}
          unit="TOTAL SPEND"
          trend="ALL TIME"
          icon={BanknotesIcon}
          colorClass="text-rose-500"
          iconBg="bg-rose-50"
        />
        <StatCard
          title="Transactions"
          value={expenses.length}
          unit="RECORDS"
          trend="LOGGED"
          icon={CreditCardIcon}
          colorClass="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Categories"
          value={breakdownCards.length}
          unit="TYPES"
          trend="TRACKED"
          icon={ChartPieIcon}
          colorClass="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Top Category"
          value={breakdownCards[0]?.name?.split(' ')[0] || 'N/A'}
          unit="HIGHEST"
          trend={breakdownCards[0] ? breakdownCards[0].percent + '%' : '0%'}
          icon={TagIcon}
          colorClass="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      {view === 'form' ? (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
          <SectionCard title="💳 New Expense Entry">
            <form onSubmit={handleSubmit} className="space-y-6 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Date *</label>
                  <input id="expenseDate" type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Mode *</label>
                  <select id="paymentMode" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none appearance-none">
                    <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>UPI</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Category *</label>
                  <select 
                    id="expenseCategory" 
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required 
                    className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl px-5 py-4 text-sm font-black text-indigo-700 outline-none"
                  >
                    <option value="">Select Category</option>
                    {ALL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Type (Auto-Detected)</label>
                  <select 
                    id="expenseType" 
                    value={expenseType}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-400 outline-none appearance-none cursor-not-allowed"
                  >
                    <option value="">Select Category First</option>
                    <option>Direct Expense</option>
                    <option>Indirect Expense</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹) *</label>
                  <input id="amount" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-lg font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="0.00" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paid To / Vendor *</label>
                  <input id="paidTo" type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none" placeholder="Vendor or payee name" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Notes</label>
                  <textarea id="remarks" rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 outline-none resize-none" placeholder="Optional notes..." />
                </div>
              </div>
              <div className="flex justify-end gap-6 pt-2">
                <button type="button" onClick={() => setView('list')} className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 uppercase text-[10px] tracking-widest transition-colors">Cancel</button>
                <button type="submit" className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black hover:bg-indigo-600 shadow-xl transition-all transform active:scale-95 uppercase text-[10px] tracking-[0.2em]">
                  Save Expense
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {breakdownCards.length > 0 && (
            <SectionCard title="Expense Breakdown by Category">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                {breakdownCards.map((cat, i) => {
                  const Icon = CATEGORY_ICONS[cat.name] || TagIcon;
                  const barColor = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <div key={i} className="bg-slate-50/70 border border-slate-100 rounded-[2rem] p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-4 group cursor-default">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-2xl bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform`}>
                          <Icon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cat.percent}% of total</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{cat.name}</p>
                        <p className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">₹{cat.amount.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${cat.percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Recent Expense Ledger">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Loading expense records...</p>
              </div>
            ) : (
              <ModernTable headers={['Date', 'Category', 'Paid To', 'Amount', 'Mode', 'Actions']}>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center font-black text-slate-300 uppercase italic text-[10px] tracking-[0.3em]">
                      No expense records found
                    </td>
                  </tr>
                ) : (
                  expenses.map(exp => (
                    <tr key={exp._id} className="hover:bg-slate-50/50 group transition-all duration-200">
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-500">{exp.date}</td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest">
                          <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full" />
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900 italic">{exp.paidTo}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-rose-600 tabular-nums">₹{Number(exp.amount).toLocaleString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-[10px] font-black text-slate-400 uppercase tracking-widest">{exp.paymentMode}</td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                          <button className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => handleDeleteExpense(exp)}>
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </ModernTable>
            )}
          </SectionCard>
        </div>
      )}
    </PageContainer>
  );
}

export default ExpensesPage;
