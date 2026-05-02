import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  CurrencyRupeeIcon,
  UsersIcon,
  DocumentChartBarIcon,
  BuildingStorefrontIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import authFetch from '../utils/authFetch';
import StatCard from '../components/ui/StatCard';
import { PageContainer, SectionCard } from '../components/ui/Layout';

const REPORT_CONFIGS = {
  'production-daily': {
    title: 'Daily Production Summary',
    endpoint: '/reports/production',
    columns: ['Date', 'Variety', 'Input (Kg)', 'Output (Kg)', 'Broken (Kg)', 'Waste (Kg)', 'Yield %'],
    keys: ['date', 'variety', 'input', 'output', 'broken', 'waste', 'yield']
  },
  'yield-analysis': {
    title: 'Milling Yield Analysis',
    endpoint: '/reports/production',
    columns: ['Date', 'Variety', 'Input (Kg)', 'Output (Kg)', 'Yield %'],
    keys: ['date', 'variety', 'input', 'output', 'yield']
  },
  'customer-wise-sales': {
    title: 'Customer Wise Sale Performance',
    endpoint: '/reports/customer-performance',
    columns: ['Customer Name', 'Last Sale', 'Total Bags', 'Total Weight (Kg)', 'Revenue (₹)', 'Outstanding'],
    keys: ['customer', 'date', 'bags', 'weight', 'total', 'outstanding']
  },
  'sales-summary': {
    title: 'Monthly Sales Summary',
    endpoint: '/reports/sales',
    columns: ['Date', 'Invoice', 'Customer', 'Variety', 'Qty (Kg)', 'Total Amount', 'Status'],
    keys: ['date', 'invoice', 'customer', 'variety', 'qty', 'total', 'status']
  },
  'stock-valuation': {
    title: 'Current Stock Valuation',
    endpoint: '/reports/stock',
    columns: ['Item Type', 'Variety', 'Godown', 'Weight (Kg)', 'Bags', 'Avg Rate', 'Valuation'],
    keys: ['item_type', 'variety', 'godown', 'weight', 'bags', 'avgRate', 'valuation']
  },
  'pl': {
    title: 'Profit & Loss Statement',
    endpoint: '/reports/financial',
    columns: ['Metric', 'Value'],
    keys: ['metric', 'value'],
    isObject: true
  },
  'gst-recon': {
    title: 'GST Reconciliation Report',
    endpoint: '/reports/financial',
    columns: ['Type', 'Amount (₹)'],
    keys: ['type', 'amount'],
    isObject: true
  }
};

const REPORT_SECTIONS = [
  {
    title: 'Operations & Production',
    icon: BuildingStorefrontIcon,
    accentColor: 'bg-indigo-600',
    items: [
      { label: 'Daily Production Summary',        key: 'production-daily',  badge: 'Daily',       badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
      { label: 'Milling Yield Analysis',          key: 'yield-analysis',    badge: 'Quality',     badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
      { label: 'Machine Efficiency & Downtime',   key: 'machine-efficiency',badge: 'Maintenance', badgeColor: 'bg-amber-50 text-amber-700 border-amber-100' },
      { label: 'Cleaning Waste & Recovery',       key: 'cleaning-waste',    badge: 'Process',     badgeColor: 'bg-sky-50 text-sky-700 border-sky-100' },
    ],
  },
  {
    title: 'Sales & Revenue',
    icon: ChartBarIcon,
    accentColor: 'bg-emerald-500',
    items: [
      { label: 'Monthly Sales Summary',            key: 'sales-summary',         badge: 'Monthly',   badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
      { label: 'Customer-wise Sales Performance',  key: 'customer-wise-sales',   badge: 'B2B',       badgeColor: 'bg-violet-50 text-violet-700 border-violet-100' },
      { label: 'Product Profitability Analysis',   key: 'product-profitability', badge: 'Finance',   badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
      { label: 'Outstanding Receivables Aging',    key: 'outstanding-aging',     badge: 'Critical',  badgeColor: 'bg-rose-50 text-rose-700 border-rose-100' },
    ],
  },
  {
    title: 'Inventory & Stock',
    icon: ArchiveBoxIcon,
    accentColor: 'bg-amber-500',
    items: [
      { label: 'Current Stock Valuation',      key: 'stock-valuation',    badge: 'Real-time',  badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
      { label: 'Godown Capacity Utilization',  key: 'godown-utilization', badge: 'Space',      badgeColor: 'bg-amber-50 text-amber-700 border-amber-100' },
      { label: 'Item-wise Stock Movement',     key: 'stock-movement',     badge: 'Logistics',  badgeColor: 'bg-sky-50 text-sky-700 border-sky-100' },
      { label: 'Paddy Stock Aging Report',     key: 'paddy-aging',        badge: 'Quality',    badgeColor: 'bg-rose-50 text-rose-700 border-rose-100' },
    ],
  },
  {
    title: 'Financial Intelligence',
    icon: BanknotesIcon,
    accentColor: 'bg-violet-600',
    items: [
      { label: 'Monthly Profit & Loss',              key: 'pl',                  badge: 'Strategic',   badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
      { label: 'Cash Flow Statement',                key: 'cash-flow',           badge: 'Finance',     badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
      { label: 'GST Input-Output Reconciliation',    key: 'gst-recon',           badge: 'Compliance',  badgeColor: 'bg-sky-50 text-sky-700 border-sky-100' },
      { label: 'Year-over-Year Performance',         key: 'annual-comparison',   badge: '12-Month',    badgeColor: 'bg-violet-50 text-violet-700 border-violet-100' },
    ],
  },
];

// --- Skeleton Loader Component ---
const TableSkeleton = ({ columns }) => (
  <tbody className="divide-y divide-slate-50">
    {[...Array(6)].map((_, i) => (
      <tr key={i} className="animate-pulse">
        {[...Array(columns)].map((__, j) => (
          <td key={j} className="px-6 py-5">
            <div className="h-4 bg-slate-100 rounded-lg w-full shadow-inner" />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

function ReportsPage() {
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    variety: 'All Varieties',
    godown: 'All Godowns'
  });

  // Data
  const [summary, setSummary] = useState(null);
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    fetchSummary();
  }, [filters]);

  useEffect(() => {
    if (activeReport) {
      fetchReportDetails(activeReport);
    }
  }, [activeReport, filters]);

  async function fetchSummary() {
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await authFetch(`/reports/summary?${query}`);
      if (res.ok) setSummary(await res.json());
    } catch (err) { console.error('Failed to fetch report summary', err); }
  }

  async function fetchReportDetails(key) {
    const config = REPORT_CONFIGS[key];
    if (!config) {
      setReportData([]);
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await authFetch(`${config.endpoint}?${query}`);
      
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      let data = await res.json();
      
      // Special handling for financial reports
      if (config.isObject && !Array.isArray(data)) {
        if (key === 'pl') {
          data = [
            { metric: 'Total Revenue', value: data.revenue },
            { metric: 'Paddy Cost', value: data.paddyCost },
            { metric: 'Operating Expenses', value: data.operatingExpenses },
            { metric: 'Gross Profit', value: data.grossProfit },
            { metric: 'Net Profit', value: data.netProfit },
          ];
        } else if (key === 'gst-recon') {
          data = [
            { type: 'Output GST (Sales)', amount: data.gst?.output },
            { type: 'Input ITC (Purchases)', amount: data.gst?.input },
            { type: 'Net Payable', amount: data.gst?.netPayable },
          ];
        }
      }
      
      setReportData(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error('Failed to fetch report details', err);
      window.dispatchEvent(new CustomEvent('erp_notification', {
        detail: { message: 'Failed to load report: ' + err.message, type: 'error' }
      }));
      setReportData([]);
    }
    finally { setLoading(false); }
  }

  const handleFilterChange = (e) => {
    const { id, value } = e.target;
    setFilters(prev => ({ ...prev, [id]: value }));
  };

  const calculateTotals = () => {
    if (!reportData || reportData.length === 0) return {};
    const config = REPORT_CONFIGS[activeReport];
    if (!config) return {};

    const totals = {};
    config.keys.forEach(key => {
      if (['input', 'output', 'total', 'amount', 'qty', 'weight', 'bags', 'value'].includes(key)) {
        totals[key] = reportData.reduce((acc, row) => acc + (parseFloat(row[key]) || 0), 0);
      }
    });
    return totals;
  };

  const renderCell = (key, value, row) => {
    const safeValue = value ?? '-';
    if (safeValue === '-') return <span className="text-slate-300">-</span>;

    // 1. Customer Performance logic with Status Badges
    if (key === 'customer' && activeReport === 'customer-wise-sales' && row) {
      const lastDate = dayjs(row.date);
      const isRegular = dayjs().diff(lastDate, 'day') <= 30;
      return (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setActiveReport('sales-summary');
              setFilters(prev => ({ ...prev, customerName: value }));
            }}
            className="font-black text-slate-900 hover:text-indigo-600 transition-colors underline decoration-slate-200 underline-offset-4"
          >
            {safeValue}
          </button>
          {isRegular ? (
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border border-emerald-100">Regular</span>
          ) : (
            <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border border-slate-100">Inactive</span>
          )}
        </div>
      );
    }

    // 2. Yield & Efficiency Logic
    if (key === 'yield' || key === 'efficiency') {
      const num = parseFloat(safeValue);
      let color = 'text-slate-700';
      if (num < 70) color = 'text-rose-600 font-black';
      else if (num < 80) color = 'text-amber-600 font-bold';
      else color = 'text-emerald-600 font-black';
      return <span className={color}>{num}%</span>;
    }

    // 3. Financial Pill Badges
    if (key === 'status' || key === 'metric') {
      const strVal = String(safeValue).toLowerCase();
      const isProfit = strVal.includes('profit') || strVal.includes('paid');
      const isLoss = strVal.includes('loss') || strVal.includes('unpaid');
      
      if (isProfit) return <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">{safeValue}</span>;
      if (isLoss) return <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100">{safeValue}</span>;
    }

    // 4. Currency & Number Formatting
    const num = parseFloat(safeValue);
    if (!isNaN(num) && safeValue !== '-' && !['invoice', 'variety', 'date', 'customer', 'item_type', 'godown'].includes(key)) {
      if (['yield', 'qty', 'weight', 'bags', 'input', 'output', 'broken', 'waste'].includes(key)) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 3 });
      }
      // All other numeric fields (financials)
      return '₹' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // 5. Date Formatting
    if (key === 'date') return dayjs(safeValue).isValid() ? dayjs(safeValue).format('DD-MM-YYYY') : safeValue;

    return String(safeValue);
  };

  const totals = calculateTotals();

  const downloadCSV = () => {
    if (!reportData || reportData.length === 0) return;
    const config = REPORT_CONFIGS[activeReport];
    const headers = (config?.columns || Object.keys(reportData[0])).join(',');
    const rows = reportData.map(row => 
      (config?.keys || Object.keys(row)).map(key => row[key] ?? '').join(',')
    ).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeReport || 'report'}_${filters.fromDate}_to_${filters.toDate}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div className="animate-in fade-in slide-in-from-left-4 duration-700">
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight uppercase italic">Business Intelligence</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-pulse" />
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic">Real-time performance metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-700">
           {activeReport && (
             <button
               onClick={() => setActiveReport(null)}
               className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10 transform active:scale-95 uppercase text-[10px] tracking-widest"
             >
               <ArrowLeftIcon className="h-4 w-4" /> Exit View
             </button>
           )}
           <button onClick={() => window.print()} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
              <DocumentChartBarIcon className="h-5 w-5" />
           </button>
        </div>
      </div>

      {!activeReport && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Avg. Milling Yield"  value={summary?.production?.avgYield?.toFixed(1) + '%'} unit="AVG" trend="OPTIMAL" icon={ArrowTrendingUpIcon}  colorClass="text-indigo-600"  iconBg="bg-indigo-50" />
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-500">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
                        <h3 className="text-2xl font-black text-emerald-600 italic tracking-tighter leading-none">₹{((summary?.sales?.totalRevenue || 0) / 1000).toFixed(1)}K</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-2xl group-hover:rotate-12 transition-transform">
                        <ChartBarIcon className="h-5 w-5 text-emerald-600" />
                    </div>
                </div>
                {summary?.sales?.top3Customers?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Top Customers</p>
                        <div className="space-y-1.5">
                            {summary.sales.top3Customers.map((c, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">{c.customer_name}</span>
                                    <span className="text-[10px] font-black text-slate-900 tabular-nums">₹{(c.revenue / 1000).toFixed(1)}K</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <StatCard title="Stock Valuation"     value={'₹' + ((summary?.stockValuation || 0) / 1000).toFixed(1) + 'K'} unit="INR" trend="ESTIMATED" icon={ArchiveBoxIcon} colorClass="text-amber-600" iconBg="bg-amber-50" />
            <StatCard title="Total Outstanding"   value={'₹' + ((summary?.outstandingReceivables || 0) / 1000).toFixed(1) + 'K'} unit="DEBT" trend="RECEIVABLE" icon={UsersIcon} colorClass="text-rose-600" iconBg="bg-rose-50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
            {REPORT_SECTIONS.map((section, idx) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
                  <div className="px-8 py-6 flex items-center gap-4 border-b border-slate-50">
                    <div className={`p-3 rounded-2xl ${section.accentColor} shadow-lg group-hover:rotate-6 transition-transform`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{section.title}</h2>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {section.items.map(item => (
                      <button
                        key={item.key}
                        onClick={() => {
                          if (REPORT_CONFIGS[item.key]) {
                            setActiveReport(item.key);
                          } else {
                            window.dispatchEvent(new CustomEvent('erp_notification', {
                              detail: { message: `The '${item.label}' report is coming soon!`, type: 'info' }
                            }));
                          }
                        }}
                        className="w-full text-left px-8 py-5 flex items-center justify-between hover:bg-slate-50 group transition-all"
                      >
                        <span className="text-sm font-black text-slate-700 group-hover:text-indigo-600 transition-colors italic">{item.label}</span>
                        <div className="flex items-center gap-2">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${item.badgeColor}`}>{item.badge}</span>
                           <div className="h-1 w-1 bg-slate-200 rounded-full group-hover:bg-indigo-600 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeReport && REPORT_CONFIGS[activeReport] && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
           <SectionCard title={REPORT_CONFIGS[activeReport].title}>
              <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            {REPORT_CONFIGS[activeReport].columns.map(h => (
                                <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    
                    {loading ? (
                        <TableSkeleton columns={REPORT_CONFIGS[activeReport].columns.length} />
                    ) : (
                        <>
                        <tbody className="divide-y divide-slate-50">
                            {reportData.length === 0 ? (
                                <tr>
                                  <td colSpan={REPORT_CONFIGS[activeReport].columns.length} className="px-6 py-24 text-center">
                                      <div className="flex flex-col items-center justify-center opacity-40">
                                         <ArchiveBoxIcon className="h-16 w-16 text-slate-300 mb-4" />
                                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">No records found for this period</p>
                                         <p className="text-[9px] text-slate-400 mt-2">Try adjusting your date filters below</p>
                                      </div>
                                  </td>
                                </tr>
                            ) : (
                                reportData.map((row, i) => {
                                    const config = REPORT_CONFIGS[activeReport];
                                    return (
                                        <tr key={i} className="hover:bg-slate-50 transition-all duration-200 group cursor-default">
                                            {config.keys.map((key, j) => (
                                                <td key={j} className="px-6 py-5 text-sm text-slate-700 tabular-nums whitespace-nowrap">
                                                    {renderCell(key, row?.[key], row)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        
                        {reportData.length > 0 && !REPORT_CONFIGS[activeReport].isObject && (
                            <tfoot className="bg-slate-50/50 border-t-2 border-indigo-100 sticky bottom-0 z-10 backdrop-blur-md">
                                <tr>
                                    {REPORT_CONFIGS[activeReport].keys.map((key, i) => {
                                        const isTotalField = totals.hasOwnProperty(key);
                                        return (
                                            <td key={i} className="px-6 py-5 text-sm font-black text-slate-900">
                                                {i === 0 ? 'TOTAL' : isTotalField ? renderCell(key, totals[key]) : ''}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        )}
                        </>
                    )}
                </table>
              </div>
           </SectionCard>
        </div>
      )}

      {/* 🚀 Global Filter Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] px-8 py-5 rounded-[2.5rem] flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
             <div className="flex flex-col">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Start Date</label>
                <input id="fromDate" type="date" value={filters.fromDate} onChange={handleFilterChange} className="bg-transparent text-xs font-black text-slate-900 outline-none" />
             </div>
             <div className="flex flex-col">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">End Date</label>
                <input id="toDate" type="date" value={filters.toDate} onChange={handleFilterChange} className="bg-transparent text-xs font-black text-slate-900 outline-none" />
             </div>
          </div>
          
          <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
             <div className="flex flex-col">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Paddy Variety</label>
                <select id="variety" value={filters.variety} onChange={handleFilterChange} className="bg-transparent text-xs font-black text-slate-900 outline-none appearance-none cursor-pointer">
                   <option>All Varieties</option>
                   <option>PR 11</option>
                   <option>Basmati 1121</option>
                   <option>Swarna</option>
                </select>
             </div>
          </div>

          <div className="flex gap-3">
             <button onClick={fetchSummary} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95">Apply Filters</button>
             <button onClick={downloadCSV} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95">Download Excel</button>
             <button onClick={() => window.print()} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95">Download PDF</button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default ReportsPage;
