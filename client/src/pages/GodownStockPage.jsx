import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowPathIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { 
  Truck, 
  RefreshCcw, 
  Factory, 
  ShoppingCart, 
  ArrowRight,
  Database,
  Activity,
  Wheat,
  CookingPot,
  Scale,
  Zap,
  LayoutDashboard,
  Box,
  AlertOctagon,
  Search,
  ArrowUpRight,
  Clock,
  X
} from 'lucide-react';

import authFetch from '../utils/authFetch';

const toKg = (kg) => {
  const val = Number(kg || 0);
  return val.toLocaleString('en-IN') + ' Kg';
};
const LOW_STOCK_LIMIT = 100; // in KG
const MILL_CAPACITY_KG = 524800;
const GODOWN_CAPACITY_KG = 100000;

function GodownStockPage() {
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  
  // Modal State
  const [selectedGodown, setSelectedGodown] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 4000);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  async function refreshAll() {
    setLoading(true);
    try {
      await Promise.all([
        fetchStock(),
        fetchSummary(),
        fetchLogs()
      ]);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStock() {
    try {
      const res = await authFetch('/stock');
      if (res.ok) setStocks(await res.json());
    } catch (err) { console.error(err); }
  }

  async function fetchSummary() {
    try {
      const res = await authFetch('/stock/summary');
      if (res.ok) setSummary(await res.json());
    } catch (err) { console.error(err); }
  }

  async function fetchLogs() {
    try {
      const res = await authFetch('/stock/logs'); // Updated to use the new stock_movements via /logs
      if (res.ok) setLogs(await res.json());
    } catch (err) { console.error(err); }
  }

  // Global Aggregates
  const totals = useMemo(() => {
    let paddy = 0, rice = 0, byprod = 0;
    summary.forEach(g => {
      paddy += Number(g.paddy_kg || 0);
      rice += Number(g.rice_kg || 0);
      byprod += Number(g.bran_kg || 0) + Number(g.husk_kg || 0) + Number(g.broken_kg || 0) + Number(g.other_kg || 0);
    });
    const totalWeightKg = (paddy + rice + byprod);
    return {
      paddy: toKg(paddy),
      rice: toKg(rice),
      byprod: toKg(byprod),
      loadPct: ((totalWeightKg / MILL_CAPACITY_KG) * 100).toFixed(1)
    };
  }, [summary]);

  // Group individual stocks by godown for detailed variety listing
  const godownDetails = useMemo(() => {
    const groups = {};
    stocks.forEach(s => {
      if (!groups[s.godown]) groups[s.godown] = [];
      groups[s.godown].push(s);
    });
    return groups;
  }, [stocks]);

  // Stock Alerts Logic
  const alerts = useMemo(() => {
    return stocks.filter(s => Number(s.availableWeightKg) < LOW_STOCK_LIMIT && Number(s.availableWeightKg) > 0);
  }, [stocks]);

  // Check if a specific godown has any low stock items
  const isGodownCritical = (godownName) => {
    return stocks.some(s => s.godown === godownName && Number(s.availableWeightKg) < LOW_STOCK_LIMIT && Number(s.availableWeightKg) > 0);
  };

  const getBarColor = (pct, hasAlert) => {
    if (pct > 90 || hasAlert) return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
    if (pct > 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-slate-300 font-sans selection:bg-indigo-500/30">
      {/* 🚀 Top Bar: Breadcrumb Style */}
      <div className="max-w-7xl mx-auto px-8 pt-8 flex justify-between items-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
        <div className="flex items-center gap-4">
           <span className="text-emerald-500 flex items-center gap-1.5 ">
             <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
             Live inventory
           </span>
           <span>Last synced: {lastRefresh ? lastRefresh.toLocaleTimeString('en-IN') : '...'}</span>
        </div>
        <div className="flex items-center gap-6">
           <span>{summary.length} godowns</span>
           <span>{toKg(MILL_CAPACITY_KG)} capacity</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12 flex justify-between items-end">
           <div>
              <h1 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-3">
                 <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <LayoutDashboard className="text-indigo-500 h-6 w-6" />
                 </div>
                 Rice Mill Pro — Godown Dashboard
              </h1>
           </div>
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[9px] tracking-[0.2em] rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/20 flex items-center gap-2 group"
              >
                <Database size={14} className="group-hover:rotate-12 transition-transform" />
                Add Godown
              </button>
              <button 
                onClick={refreshAll}
                disabled={loading}
                className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-slate-400"
              >
                 <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
           </div>
        </div>

        {/* 🚀 Section 1: Mill Overview */}
        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-6">Mill Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
           <OverviewCard title="Total Paddy" value={totals.paddy} sub="Across 3 godowns" icon={<Wheat size={20} />} color="text-orange-500" />
           <OverviewCard title="Total Rice" value={totals.rice} sub="Ready to dispatch" icon={<CookingPot size={20} />} color="text-indigo-400" />
           <OverviewCard title="By-products" value={totals.byprod} sub="Husk + Bran combined" icon={<Scale size={20} />} color="text-slate-400" />
           <OverviewCard title="Mill Capacity" value={`${totals.loadPct}%`} sub={`${toKg((Number(totals.loadPct) * MILL_CAPACITY_KG) / 100)} / ${toKg(MILL_CAPACITY_KG)}`} icon={<Zap size={20} />} color="text-amber-400" />
        </div>

        {/* 🚀 Section 2: Godown Blocks */}
        <div className="flex justify-between items-center mb-8">
           <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Godown Blocks</h2>
           <div className="flex gap-2">
              <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                 <RefreshCcw size={12} /> Stock Transfer
              </button>
              <button className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                 <Search size={12} /> Stock Audit
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
           {summary.map(g => {
              const totalKg = Number(g.total_kg || 0);
              const fillPct = Math.min(100, (totalKg / GODOWN_CAPACITY_KG) * 100);
              const hasAlert = isGodownCritical(g.name);

              return (
                <div key={g.name} className={`bg-[#1A1A1A] rounded-[2rem] border overflow-hidden transition-all duration-300 ${hasAlert ? 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.1)]' : 'border-white/5 shadow-xl shadow-black/20'}`}>
                   <div className="p-8">
                     <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-white/5 rounded-2xl">
                              <BuildingOffice2Icon className="h-6 w-6 text-indigo-400" />
                           </div>
                           <div>
                              <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">{g.name}</h3>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                 Capacity: {toKg(GODOWN_CAPACITY_KG)} | Utilized: {toKg(totalKg)} ({fillPct.toFixed(0)}%)
                              </p>
                           </div>
                        </div>
                        <button 
                          onClick={() => { setSelectedGodown(g.name); setIsModalOpen(true); }}
                          className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all shadow-lg shadow-indigo-500/5"
                        >
                           View Details
                        </button>
                     </div>

                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-8">
                        <div 
                           className={`h-full transition-all duration-1000 ease-out ${getBarColor(fillPct, hasAlert)}`}
                           style={{ width: `${fillPct}%` }}
                        />
                     </div>

                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Stock Summary</p>
                        
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                           <SummaryRow label="Raw Paddy" value={g.paddy_kg} color="text-orange-400" />
                           <SummaryRow label="Finished Rice" value={g.rice_kg} color="text-indigo-400" />
                           <SummaryRow label="Rice Bran" value={g.bran_kg} color="text-blue-400" />
                           <SummaryRow label="Rice Husk" value={g.husk_kg} color="text-amber-400" />
                           <SummaryRow label="Others" value={Number(g.broken_kg) + Number(g.other_kg)} color="text-slate-500" />
                        </div>
                     </div>
                   </div>
                </div>
              );
           })}
        </div>

        {/* 🚀 Section 3: Stock Alerts (High Visibility White Card) */}
        <div className="mb-16">
           <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden">
              <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-50 rounded-2xl">
                       <AlertOctagon className="text-rose-500 h-6 w-6" />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Stock alerts & notifications</h2>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Automatic threshold triggers for real-time restocking</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <span className="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
                 </div>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                          <th className="px-10 py-5">Alert Type</th>
                          <th className="px-10 py-5">Item</th>
                          <th className="px-10 py-5">Godown</th>
                          <th className="px-10 py-5">Current Stock</th>
                          <th className="px-10 py-5">Min Required</th>
                          <th className="px-10 py-5">Priority</th>
                          <th className="px-10 py-5">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {alerts.length === 0 ? (
                          <tr>
                             <td colSpan={7} className="px-10 py-12 text-center text-slate-300 font-black uppercase tracking-widest italic text-xs">
                                All inventory levels strictly optimal
                             </td>
                          </tr>
                       ) : (
                          alerts.map((item, id) => (
                             <tr key={id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-10 py-8">
                                   <span className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Critical</span>
                                </td>
                                <td className="px-10 py-8 font-black text-slate-900 italic text-sm">{item.type}</td>
                                <td className="px-10 py-8 font-black text-slate-600 uppercase text-[11px] italic tracking-tight">{item.godown}</td>
                                <td className="px-10 py-8 font-black text-slate-900 italic text-base">{toKg(item.availableWeightKg)}</td>
                                <td className="px-10 py-8 font-black text-slate-300 text-[11px] italic">0.1 T</td>
                                <td className="px-10 py-8">
                                   <span className="text-rose-500 flex items-center gap-1.5 text-[11px] font-black uppercase italic">
                                      <Activity size={12} /> High
                                   </span>
                                </td>
                                <td className="px-10 py-8">
                                   <div className="flex gap-2">
                                      <button className="px-6 py-3 bg-white border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-600 transition-all opacity-40 hover:opacity-100">Restock</button>
                                      <button className="px-6 py-3 bg-white border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-600 transition-all opacity-40 hover:opacity-100">Transfer</button>
                                      <button className="px-6 py-3 bg-white border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-600 transition-all opacity-40 hover:opacity-100">Inspect</button>
                                   </div>
                                </td>
                             </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* 🚀 Section 4: Vertical Movement Log */}
        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
           <Activity size={14} className="text-indigo-500" />
           Movement Log
        </h2>
        <div className="max-w-4xl space-y-0 relative border-l border-white/5 ml-4">
           {logs.map((log, i) => (
              <div key={i} className="pl-12 pb-12 relative group">
                 {/* Connection Marker */}
                 <div className={`absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full z-10 shadow-[0_0_10px_currentColor] ${
                    log.action_type === 'SALE' ? 'text-emerald-500 bg-emerald-500' :
                    log.action_type === 'CLEANING' || log.action_type === 'CLEANING_RESULT' ? 'text-blue-500 bg-blue-500' :
                    log.action_type === 'PRODUCTION_INPUT' || log.action_type === 'PRODUCTION_OUTPUT' ? 'text-orange-500 bg-orange-500' :
                    'text-indigo-500 bg-indigo-500'
                 }`} />
                 
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                       <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest w-16">{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                       <div>
                          <p className="text-xs font-black text-slate-400 flex items-center gap-2 mb-1">
                             <span className={`px-2 py-0.5 rounded text-[9px] tracking-widest uppercase ${
                                log.action_type === 'SALE' ? 'bg-emerald-500/10 text-emerald-500' :
                                log.action_type.includes('CLEANING') ? 'bg-blue-500/10 text-blue-500' :
                                log.action_type.includes('PRODUCTION') ? 'bg-orange-500/10 text-orange-500' :
                                'bg-indigo-500/10 text-indigo-500'
                             }`}>{log.action_type}</span>
                             {log.description || log.path}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-tighter italic">
                             {toKg(Number(log.weight_tonne) * 1000)} • {log.path.replace(' ➔ ', ' → ')}
                          </div>
                       </div>
                    </div>
                    {/* Visual Pulse for alert type logs */}
                    {log.action_type === 'SALE' && i === 0 && (
                       <span className="text-[9px] font-black bg-emerald-500/5 text-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20 italic">Success Dispatch</span>
                    )}
                 </div>
              </div>
           ))}
         </div>
      </div>

        {/* 🚀 Detail Modal: Full Variety List */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="bg-[#1A1A1A] w-full max-w-2xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-indigo-500/5">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                         <Database size={24} />
                      </div>
                      <div>
                         <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{selectedGodown}</h2>
                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Detailed Stock Variety Registry</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setIsModalOpen(false)}
                     className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-all rounded-2xl"
                   >
                      <X size={20} />
                   </button>
                </div>

                <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
                   <div className="space-y-4">
                      {(godownDetails[selectedGodown] || []).map((item, idx) => (
                         <div key={idx} className="flex justify-between items-center p-5 bg-white/2 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                            <div className="flex flex-col">
                               <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">
                                  {item.type}
                               </span>
                               <span className="text-lg font-black text-white italic tracking-tighter">
                                  {item.variety} {item.riceType}
                               </span>
                            </div>
                            <div className="text-right">
                               <p className="text-2xl font-black text-white italic tracking-tighter">{toKg(item.availableWeightKg)}</p>
                               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">{item.bags} Bags</p>
                            </div>
                         </div>
                      ))}
                      {(godownDetails[selectedGodown] || []).length === 0 && (
                         <p className="text-center text-slate-500 py-12 font-black uppercase italic tracking-widest text-xs">No product rows found for this godown</p>
                      )}
                   </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-white/1 flex justify-end gap-3">
                   <button 
                     onClick={() => setIsModalOpen(false)}
                     className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all"
                   >
                      Close Registry
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* 🚀 Toast Notification */}
        {toast.show && (
          <div className="fixed top-8 right-8 z-[200] animate-in slide-in-from-right-8 duration-500">
            <div className="bg-[#1A1A1A] border border-emerald-500/50 px-8 py-5 rounded-2xl shadow-2xl shadow-emerald-500/20 flex items-center gap-4 backdrop-blur-xl">
              <div className="h-10 w-10 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center">
                <Database size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">System Action</p>
                <p className="text-sm font-black text-white italic tracking-tighter">{toast.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* 🚀 Add Godown Modal */}
        {isAddModalOpen && (
          <AddGodownModal 
            onClose={() => setIsAddModalOpen(false)} 
            onSuccess={(name) => {
              showToast(`New Godown Added Successfully!`);
              refreshAll();
            }}
          />
        )}
      </div>
    );
  }

function AddGodownModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('100000');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const res = await authFetch('/stock/godowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, capacityKg: capacity })
      });
      if (res.ok) {
        onSuccess(name);
        onClose();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add godown');
      }
    } catch (err) {
      alert('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1A1A1A] w-full max-w-lg rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-indigo-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Add Godown</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Register New Storage Asset</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-all rounded-2xl">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Godown Name</label>
            <input 
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Godown E - Cold Store"
              className="w-full bg-white/2 border border-white/5 rounded-2xl px-6 py-5 text-lg font-black text-white italic tracking-tighter focus:border-indigo-500/50 focus:bg-white/5 transition-all outline-none"
              required
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Capacity (Kg)</label>
            <div className="relative">
              <input 
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="100000"
                className="w-full bg-white/2 border border-white/5 rounded-2xl px-6 py-5 text-lg font-black text-white italic tracking-tighter focus:border-indigo-500/50 focus:bg-white/5 transition-all outline-none"
              />
              <span className="absolute right-6 top-5 text-xs font-black text-indigo-500 uppercase italic">KG</span>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
            >
              {loading ? 'Registering...' : 'Register Godown'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center group cursor-default">
       <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight group-hover:text-slate-300 transition-colors">{label}</span>
       <span className={`text-xs font-black italic tracking-tighter ${Number(value) > 0 ? color : 'text-slate-700'}`}>
          {Number(value) > 0 ? toKg(value) : '—'}
       </span>
    </div>
  );
}

function OverviewCard({ title, value, sub, icon, color }) {
  return (
    <div className="bg-[#1A1A1A] p-8 rounded-[2rem] border border-white/5 hover:border-indigo-500/20 transition-all shadow-xl shadow-black/20 group">
       <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6">{title}</p>
       <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-black text-white italic tracking-tighter underline decoration-indigo-500/30 underline-offset-8">{value}</span>
       </div>
       <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-6">{sub}</p>
       <div className={`p-4 bg-white/2 rounded-2xl group-hover:scale-110 transition-transform w-fit ${color}`}>
          {icon}
       </div>
    </div>
  );
}

export default GodownStockPage;
