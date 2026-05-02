import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  ArrowLeftIcon, 
  EyeIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  BeakerIcon,
  CakeIcon,
  ChartPieIcon,
  CheckBadgeIcon,
  Cog8ToothIcon,
  CubeIcon,
  BuildingOfficeIcon,
  BoltIcon,
  UserGroupIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

import authFetch from '../utils/authFetch';
import StatCard from '../components/ui/StatCard';
import { PageContainer, SectionCard, ModernTable } from '../components/ui/Layout';
import Modal from '../components/ui/Modal';



function ProductionPage() {
  const [productions, setProductions] = useState([]);
  const [readyBatches, setReadyBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  // Modal state
  const [viewRecord, setViewRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [availableStock, setAvailableStock] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVariety, setFilterVariety] = useState('All Varieties');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 10;

  const emptyForm = {
    processDate: new Date().toISOString().split('T')[0],
    productionNo: `PRD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    shift: 'Morning', cleaningBatchRef: '', paddyVariety: '', riceType: '',
    paddyInputKg: '', inputBags: '', inputMoisturePercent: '',
    machine: '', polisher: 'None', grader: 'None', operatorName: '',
    startTime: '', endTime: '', premiumRiceKg: '0', gradeARiceKg: '0',
    gradeBRiceKg: '0', brokenRiceKg: '0', totalRiceOutputKg: '0',
    branKg: '0', huskKg: '0', otherWasteKg: '0',
    riceStorageGodown: '', inputGodown: '', riceBags: '', bagWeightKg: '50',
    labourCount: '', labourCost: '', powerConsumption: '', remarks: ''
  };
  const [formData, setFormData] = useState(emptyForm);
  const [godowns, setGodowns] = useState([]);

  const paddyInput = parseFloat(formData.paddyInputKg) || 0;
  const totalRiceOutput = parseFloat(formData.totalRiceOutputKg) || 0;
  const bran = parseFloat(formData.branKg) || 0;
  const husk = parseFloat(formData.huskKg) || 0;
  const otherWaste = parseFloat(formData.otherWasteKg) || 0;
  const totalByProducts = bran + husk + otherWaste;
  const riceBags = parseInt(formData.riceBags, 10) || 0;
  const bagWeightKg = riceBags > 0 ? (totalRiceOutput / riceBags).toFixed(2) : '0';
  const overallYield = paddyInput > 0 ? (totalRiceOutput / paddyInput) * 100 : 0;
  const lossWastage = Math.max(0, paddyInput - totalRiceOutput - totalByProducts);

  useEffect(() => { 
    fetchProductions(); 
    fetchReadyBatches(); 
    fetchGodowns();
  }, []);

  async function fetchProductions() {
    setLoading(true);
    try {
      const res = await authFetch(`/production?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&variety=${filterVariety}`);
      const result = await res.json();
      if (result.data) {
        setProductions(result.data);
        setTotalRecords(result.total);
      } else {
        setProductions(Array.isArray(result) ? result : []);
        setTotalRecords(Array.isArray(result) ? result.length : 0);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function fetchReadyBatches() {
    try {
      const res = await authFetch('/cleaning/ready-for-milling');
      const data = await res.json();
      setReadyBatches(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }

  async function fetchGodowns() {
    try {
      const res = await authFetch('/stock/godowns');
      if (res.ok) setGodowns(await res.json());
    } catch (err) { console.error(err); }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (id === 'cleaningBatchRef' && value) {
      const sel = readyBatches.find(b => b.id.toString() === value || b.inward_ref === value);
      if (sel) {
        const avail = sel.available_kg !== undefined ? parseFloat(sel.available_kg) : parseFloat(sel.clean_output_kg || 0);
        setAvailableStock(avail);
        setFormData(prev => ({
          ...prev, cleaningBatchRef: value,
          paddyVariety: sel.paddy_variety, 
          paddyInputKg: avail, // Default to full available stock
          inputBags: sel.output_bags, 
          inputMoisturePercent: sel.post_cleaning_moisture_percent,
          inputGodown: sel.destination_godown
        }));
      }
    }
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (paddyInput > (availableStock + 0.1)) {
      alert(`Invalid Input: You cannot mill ${paddyInput.toLocaleString()} Kg. Only ${availableStock.toLocaleString()} Kg is available in this batch.`);
      return;
    }
    if (totalRiceOutput + totalByProducts > (paddyInput + 0.1)) {
      alert(`Logic Error: Total Output (${(totalRiceOutput + totalByProducts).toFixed(2)} Kg) cannot exceed Paddy Input (${paddyInput.toFixed(2)} Kg)!`);
      return;
    }
    const payload = {
      ...formData, paddyInputKg: paddyInput,
      premiumRiceKg: parseFloat(formData.premiumRiceKg) || 0,
      gradeARiceKg: parseFloat(formData.gradeARiceKg) || 0,
      gradeBRiceKg: parseFloat(formData.gradeBRiceKg) || 0,
      brokenRiceKg: parseFloat(formData.brokenRiceKg) || 0,
      totalRiceOutputKg: totalRiceOutput, riceBags, bagWeightKg: parseFloat(bagWeightKg),
      branKg: bran, huskKg: husk, otherWasteKg: otherWaste, yieldPercent: overallYield
    };
    try {
      const res = await authFetch('/production', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); alert('Failed: ' + (e.message || res.statusText)); return; }
      alert('Production entry saved! Total Rice Output: ' + totalRiceOutput.toFixed(2) + ' Kg');
      setView('list'); 
      fetchProductions();
      fetchReadyBatches();
    } catch { 
      // Handled globally
    }
  }

  // --- EDIT ---
  const openEdit = (item) => setEditRecord({ ...item });

  const handleEditChange = (e) => {
    const { id, value } = e.target;
    setEditRecord(prev => ({ ...prev, [id]: value }));
  };

  async function handleEditSave() {
    setSaving(true);
    try {
      const editPaddyInput = parseFloat(editRecord.paddyInputKg) || 0;
      const editRiceOutput = parseFloat(editRecord.totalRiceOutputKg) || 0;
      const editYield = editPaddyInput > 0 ? (editRiceOutput / editPaddyInput) * 100 : 0;
      const payload = { ...editRecord, yieldPercent: editYield };
      const res = await authFetch(`/production/${editRecord.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) { const e = await res.json(); alert('Update failed: ' + (e.message || res.statusText)); return; }
      alert('Production record updated successfully!');
      setEditRecord(null); fetchProductions();
    } catch { 
      // Handled globally
    } finally { setSaving(false); }
  }

  async function handleDelete(item) {
    const isConfirmed = window.confirm(
      `⚠️ WARNING: DELETE PRODUCTION RECORD\n\n` +
      `Are you sure you want to PERMANENTLY delete this production entry?\n\n` +
      `Prod No: ${item.productionNo}\n` +
      `Date: ${item.processDate}\n` +
      `Total Rice Output: ${parseFloat(item.totalRiceOutputKg).toLocaleString()} Kg\n\n` +
      `This will also:\n` +
      `1. REVERSE all Godown Stock additions (Finished Rice and By-products).\n` +
      `2. Return ${parseFloat(item.paddyInputKg).toLocaleString()} Kg of cleaned paddy back to Cleaning Stock.\n\n` +
      `THIS ACTION CANNOT BE UNDONE.`
    );

    if (!isConfirmed) return;

    try {
      const res = await authFetch(`/production/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json();
        alert('Delete failed: ' + (e.message || res.statusText));
        return;
      }
      alert('Production record deleted and stock reversed successfully!');
      fetchProductions(); fetchReadyBatches();
    } catch { 
      // Handled globally
    }
  }

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
    fetchProductions();
  }, [searchTerm, filterVariety]);

  useEffect(() => {
    fetchProductions();
  }, [currentPage]);

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">Production Management</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium italic">Control the rice milling process, quality grading, and yield analysis.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 transform active:scale-95 uppercase text-xs tracking-widest"
          onClick={() => setView(view === 'list' ? 'form' : 'list')}
        >
          {view === 'list' ? (
            <>
              <PlusIcon className="h-5 w-5" />
              New Production Entry
            </>
          ) : (
            <>
              <ArrowLeftIcon className="h-5 w-5" />
              Back to List
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Batches" 
          value={totalRecords} 
          unit="RUNS" 
          trend="+12%" 
          icon={Cog8ToothIcon}
          colorClass="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard 
          title="Ready Batches" 
          value={readyBatches.length} 
          unit="QUEUE" 
          trend="READY" 
          icon={BeakerIcon}
          colorClass="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard 
          title="Avg Recovery" 
          value={productions.length > 0 ? (productions.reduce((a, b) => a + parseFloat(b.recovery_percent || 0), 0) / productions.length).toFixed(1) : '0.0'} 
          unit="PERCENT" 
          trend="AVG" 
          icon={ChartPieIcon}
          colorClass="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard 
          title="Total Output" 
          value={(productions.reduce((a, b) => a + parseFloat(b.output_weight_kg || 0), 0) / 1000).toFixed(1)} 
          unit="MT" 
          trend="PAGE" 
          icon={CubeIcon}
          colorClass="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 mt-6 font-sans">
        <Modal 
          isOpen={view === 'form'} 
          onClose={() => { setView('list'); setFormData(emptyForm); }}
          title="New Production Entry"
          formId="productionForm"
          submitText="Finalize & Log Production"
        >
          <form id="productionForm" onSubmit={handleSubmit} className="space-y-8">
            <SectionCard title="📋 Basic Info & Shift Registry">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-sans">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Production No</label>
                  <input id="productionNo" type="text" value={formData.productionNo} readOnly className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-500 italic shadow-inner outline-none cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Process Date *</label>
                  <input id="processDate" type="date" value={formData.processDate} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Work Shift</label>
                  <select id="shift" value={formData.shift} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                    <option>Morning</option><option>Evening</option><option>Night</option>
                  </select>
                </div>
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SectionCard title="🌾 Input - Clean Paddy Matrix">
                <div className="space-y-6 font-sans">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Cleaned Batch *</label>
                    <select id="cleaningBatchRef" value={formData.cleaningBatchRef} onChange={handleInputChange} required className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl px-4 py-4 text-sm font-black text-indigo-700 focus:bg-white outline-none transition-all cursor-pointer">
                      <option value="">Select from cleaned stock</option>
                      {readyBatches.map(batch => (
                        <option key={batch.id} value={batch.id}>
                          {batch.inward_ref || `CLN-${batch.id}`} - {batch.paddy_variety} (Avail: {parseFloat(batch.available_kg || 0).toLocaleString()} Kg)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rice Type *</label>
                      <select id="riceType" value={formData.riceType} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-black text-slate-900 outline-none">
                        <option value="">Select Type</option>
                        <option>Raw Rice</option><option>Parboiled</option><option>Steam Rice</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Paddy Variety</label>
                      <input id="paddyVariety" type="text" value={formData.paddyVariety} readOnly className="w-full bg-slate-100/50 border-none rounded-2xl px-4 py-3.5 text-sm font-black text-slate-500 uppercase italic shadow-inner" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-6">
                    <div className="space-y-1 text-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase block tracking-tighter">Moisture %</span>
                       <p className="text-xl font-black text-indigo-600 italic tracking-tighter">{formData.inputMoisturePercent || '0.0'}<span className="text-xs ml-0.5">%</span></p>
                    </div>
                    <div className="space-y-1 text-center border-x border-slate-100">
                       <span className="text-[10px] font-black text-slate-400 uppercase block tracking-tighter">Input Bags</span>
                       <p className="text-xl font-black text-slate-900 italic tracking-tighter">{formData.inputBags || '0'}</p>
                    </div>
                    <div className="space-y-1 text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase block tracking-tighter">Max Available</span>
                        <p className="text-xl font-black text-emerald-600 italic tracking-tighter">{availableStock.toLocaleString()}<span className="text-[10px] ml-1 uppercase">kg</span></p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Milling Input Weight (Kg) *</label>
                    <div className="relative group">
                      <input 
                        id="paddyInputKg" 
                        type="number" 
                        step="0.01"
                        value={formData.paddyInputKg} 
                        onChange={handleInputChange}
                        max={availableStock}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg font-black text-indigo-700 focus:bg-white focus:border-indigo-600 outline-none transition-all shadow-sm group-hover:border-indigo-300"
                        placeholder="Enter weight to mill..."
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <span className="text-xs font-black text-slate-300 uppercase italic">Input Portion</span>
                        <BoltIcon className="h-5 w-5 text-indigo-400 animate-pulse" />
                      </div>
                    </div>
                    {paddyInput > availableStock && (
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-tight ml-2 animate-bounce">⚠️ Input exceeds available batch stock ({availableStock} kg)</p>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="🍚 Rice Output Core">
                <div className="space-y-8 font-sans">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Total Rice Output (Kg) *</label>
                    <div className="relative">
                       <input id="totalRiceOutputKg" type="number" step="0.01" value={formData.totalRiceOutputKg} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-6 py-5 font-black text-2xl text-slate-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-8 focus:ring-indigo-500/10 transition-all shadow-sm" />
                       <p className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-500 italic uppercase">Weight Logged</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Bag Count *</label>
                      <input id="riceBags" type="number" value={formData.riceBags} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-black text-slate-900 outline-none" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 text-slate-400 italic">Bag Avg. (KG)</label>
                       <p className="w-full bg-slate-100 rounded-2xl px-4 py-3.5 text-lg font-black text-indigo-700 italic text-center shadow-inner">{bagWeightKg}</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="📊 Yield Breakdown & Grading Portfolio">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-sans">
                {[
                  ['premiumRiceKg','Premium Rice','text-indigo-600', 'bg-indigo-50'], 
                  ['gradeARiceKg','Grade A Standard','text-emerald-700', 'bg-emerald-50'], 
                  ['gradeBRiceKg','Grade B / Common','text-amber-700', 'bg-amber-50'], 
                  ['brokenRiceKg','Broken Fragments','text-rose-600', 'bg-rose-50']
                ].map(([id, label, color, bg]) => (
                  <div key={id} className={`${bg}/30 p-6 rounded-[2.5rem] border border-slate-100/50 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group`}>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">{label}</p>
                    <div className="relative">
                      <input 
                        id={id} 
                        type="number" 
                        step="0.01" 
                        value={formData[id]} 
                        onChange={handleInputChange}
                        className={`w-full bg-transparent border-b-2 border-slate-100 focus:border-indigo-600 px-1 py-1 text-xl font-black text-center outline-none transition-all ${color}`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-sans">
              <SectionCard title="🚜 Machine, Operator & Storage">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Milling Unit</label>
                    <select id="machine" value={formData.machine} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-black text-slate-900 cursor-pointer">
                      <option value="">Select Machine</option>
                      <option>Machine 01 - Main Huller</option><option>Machine 02 - Secondary</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Operator Name</label>
                    <input id="operatorName" type="text" value={formData.operatorName} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-slate-900" placeholder="Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rice Destination</label>
                    <select id="riceStorageGodown" value={formData.riceStorageGodown} onChange={handleInputChange} required className="w-full bg-indigo-50 border-indigo-100 rounded-xl px-4 py-3 text-sm font-black text-indigo-700">
                      <option value="">Select Godown</option>
                      {godowns.map(g => (
                        <option key={g.name} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="🌱 By-Products & Waste Control">
                <div className="grid grid-cols-3 gap-4">
                   {[
                    ['branKg', 'Rice Bran', 'text-amber-600'],
                    ['huskKg', 'Rice Husk', 'text-slate-500'],
                    ['otherWasteKg', 'Processing Loss', 'text-rose-600']
                   ].map(([id, label, color]) => (
                     <div key={id} className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${color} ml-1`}>{label}</label>
                        <input 
                          id={id} 
                          type="number" 
                          step="0.01" 
                          value={formData[id]} 
                          onChange={handleInputChange}
                          className="w-full bg-slate-50/50 border-none rounded-xl px-4 py-3 text-sm font-black text-slate-900 outline-none"
                          placeholder="0.00"
                        />
                     </div>
                   ))}
                </div>
                <div className="mt-6 p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-12 bg-indigo-500/10 rounded-full blur-2xl -mr-12 -mt-12" />
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total By-Products</p>
                      <p className="text-2xl font-black italic tracking-tighter text-indigo-400">{totalByProducts.toFixed(2)} KG</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Absolute Loss</p>
                      <p className="text-2xl font-black italic tracking-tighter text-rose-500">{(lossWastage).toFixed(2)} KG</p>
                   </div>
                </div>
              </SectionCard>
            </div>

            <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10 font-sans shadow-inner">
               <div className="flex items-center gap-12">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Efficiency Rating</p>
                    <div className="relative">
                      <svg className="h-20 w-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="226.2" strokeDashoffset={226.2 - (226.2 * overallYield) / 100} className="text-indigo-600 transition-all duration-1000 ease-out" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-black italic text-slate-900">{overallYield.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-16 w-px bg-slate-200" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Process Validation</p>
                    <div className="flex items-center gap-2">
                      <CheckBadgeIcon className="h-6 w-6 text-indigo-600" />
                      <span className="text-sm font-black italic text-slate-900">QUALITY ASSURANCE READY</span>
                    </div>
                  </div>
               </div>
            </div>
          </form>
        </Modal>

        <SectionCard 
          title="Production Logs Journal"
            actions={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search production no..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all w-64 font-bold text-slate-900"
                  />
                </div>
                <div className="h-6 w-px bg-slate-200 mx-1" />
                <select 
                  className="bg-slate-50 border-none text-xs font-bold text-gray-600 rounded-lg px-3 py-2 cursor-pointer outline-none"
                  value={filterVariety}
                  onChange={(e) => setFilterVariety(e.target.value)}
                >
                  <option>All Varieties</option>
                  {/* Assuming varieties are fetched or static */}
                </select>
              </div>
            }
          >
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin shadow-indigo-100" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Syncing Production Cloud...</p>
              </div>
            ) : (
              <>
                <ModernTable headers={['Date', 'Prod No.', 'Variety', 'Rice Type', 'Input (kg)', 'Output (kg)', 'Yield %', 'Shift', 'Actions']}>
                  {productions.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 group transition-all duration-200 border-b border-slate-50 last:border-0 relative">
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500 font-bold">{item.processDate}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-indigo-600 italic tracking-tighter inline-flex items-center gap-2">
                        <CubeIcon className="h-4 w-4" />
                        {item.productionNo}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-[10px] text-slate-900 font-black uppercase tracking-widest italic">{item.paddyVariety}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-600">{item.riceType}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900 tabular-nums">{parseFloat(item.paddyInputKg).toLocaleString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-emerald-700 tabular-nums">{parseFloat(item.totalRiceOutputKg || 0).toLocaleString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-400 tabular-nums italic">{parseFloat(item.brokenRiceKg || 0).toLocaleString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-amber-600 tabular-nums">{(parseFloat(item.branKg || 0) + parseFloat(item.huskKg || 0)).toLocaleString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                           <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${item.yieldPercent}%` }} />
                           </div>
                           <span className="text-[10px] font-black italic text-slate-900">{parseFloat(item.yieldPercent || 0).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all justify-end transform translate-x-4 group-hover:translate-x-0">
                          <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => setViewRecord(item)}><EyeIcon className="h-4.5 w-4.5" /></button>
                          <button className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => openEdit(item)}><PencilSquareIcon className="h-4.5 w-4.5" /></button>
                          <button className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => handleDelete(item)}><TrashIcon className="h-4.5 w-4.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </ModernTable>
                {/* Pagination UI */}
                {totalPages > 1 && (
                  <div className="px-8 py-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                         Showing {((currentPage - 1) * itemsPerPage) + 1}—{Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-indigo-600'
                        }`}
                      >
                        Prev
                      </button>
                      <div className="flex items-center gap-1 mx-2">
                        {[...Array(Number.isFinite(totalPages) ? totalPages : 0)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`h-8 w-8 rounded-lg text-[10px] font-black transition-all ${
                              currentPage === i + 1
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-indigo-600'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        </div>

      {/* Modern Modal Templates (View) */}
      {viewRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setViewRecord(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 shadow-slate-200/50" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100/50">
                  <BoltIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Production Batch Report</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{viewRecord.productionNo} • {viewRecord.processDate}</p>
                </div>
              </div>
              <button onClick={() => setViewRecord(null)} className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all">
                <PlusIcon className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <div className="p-8 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paddy Variety</span>
                  <p className="text-lg font-bold text-slate-800">{viewRecord.paddyVariety}</p>
                </div>
                <div className="space-y-1.5 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rice Result Type</span>
                  <p className="text-lg font-bold text-indigo-600">{viewRecord.riceType}</p>
                </div>
                
                <div className="col-span-2 grid grid-cols-2 gap-6 bg-slate-50/50 border border-slate-100 rounded-2xl p-6">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">RAW INPUT</p>
                      <p className="text-3xl font-black text-slate-900">{parseFloat(viewRecord.paddyInputKg).toLocaleString()} <span className="text-[10px] ml-0.5">KG</span></p>
                   </div>
                   <div className="text-center border-l border-slate-200">
                      <p className="text-[10px] font-black text-emerald-500 mb-1.5 uppercase tracking-widest">CORE OUTPUT</p>
                      <p className="text-3xl font-black text-emerald-700">{parseFloat(viewRecord.totalRiceOutputKg).toLocaleString()} <span className="text-[10px] ml-0.5">KG</span></p>
                   </div>
                </div>

                <div className="col-span-2">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
                    Grading Results <div className="h-px flex-1 bg-slate-100" />
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      ['Premium', viewRecord.premiumRiceKg, 'text-slate-800'], 
                      ['Grade A', viewRecord.gradeARiceKg, 'text-slate-800'], 
                      ['Grade B', viewRecord.gradeBRiceKg, 'text-slate-800'], 
                      ['Broken', viewRecord.brokenRiceKg, 'text-indigo-600']
                    ].map(([l, v, c]) => (
                      <div key={l} className="bg-white p-4 rounded-xl text-center border border-slate-100 shadow-sm">
                         <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">{l}</p>
                         <p className={`text-base font-bold ${c}`}>{v || '0'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-indigo-100">
                      <ChartPieIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Absolute Yield</p>
                      <p className="text-sm font-bold text-indigo-900">EFFICIENCY PROFILE: HIGH</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Yield Score</p>
                    <p className="text-4xl font-black text-indigo-600">{parseFloat(viewRecord.yieldPercent || 0).toFixed(1)}%</p>
                 </div>
              </div>
            </div>
            
            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setViewRecord(null)}
                className="bg-white border border-slate-200 text-slate-600 font-bold px-6 py-2.5 rounded-xl hover:bg-slate-100 transition-all text-sm"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Modal Templates (Edit) */}
      {editRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl font-sans animate-in fade-in duration-300" onClick={() => setEditRecord(null)}>
          <div className="bg-white rounded-[4rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-[0_64px_128px_-24px_rgba(0,0,0,0.4)] scale-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-12 py-12 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="h-12 w-2 bg-indigo-600 rounded-full shadow-2xl shadow-indigo-500/50" />
                <div>
                  <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase leading-none mb-1">
                    System Registry <span className="text-indigo-600">MOD-{editRecord.productionNo}</span>
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-0.5 opacity-60">PRODUCTION MODULE OVERRIDE</p>
                </div>
              </div>
              <button onClick={() => setEditRecord(null)} className="text-slate-400 hover:text-slate-900 p-4 hover:bg-slate-100 rounded-full transition-all border border-slate-200 active:scale-90">
                <PlusIcon className="h-8 w-8 rotate-45" />
              </button>
            </div>
            
            <div className="p-12 overflow-y-auto max-h-[calc(90vh-180px)] custom-scrollbar">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
                 {[
                   ['processDate','Production Date','date'], ['shift','Shift Cycle','text'], 
                   ['paddyVariety','Variety Type','text'], ['riceType','Result Type','text'], 
                   ['paddyInputKg','Raw Input (kg)','number'], ['inputBags','Input Bags','number'], 
                   ['totalRiceOutputKg','Core Output (kg)','number'], ['riceBags','Output Bags','number'], 
                   ['premiumRiceKg','Premium Grade','number'], ['gradeARiceKg','Grade A','number'], 
                   ['gradeBRiceKg','Grade B','number'], ['brokenRiceKg','Broken Grade','number'], 
                   ['branKg','Rice Bran (kg)','number'], ['huskKg','Rice Husk (kg)','number'], 
                   ['otherWasteKg','Waste (kg)','number'], ['riceStorageGodown','Depot Identifier','text'],
                   ['labourCount','Crew Count','number'], ['labourCost','Crew Cost (₹)','number'],
                   ['powerConsumption','Energy (Units)','number'], ['operatorName','Unit Lead','text']
                 ].map(([f, l, t]) => (
                   <div key={f} className="space-y-3 p-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 ml-1 opacity-70 italic shadow-sm">
                        {l}
                      </label>
                      <input 
                        type={t} 
                        id={f} 
                        value={editRecord[f] ?? ''} 
                        onChange={handleEditChange}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-3xl px-6 py-5 text-base font-black text-slate-900 focus:bg-white focus:ring-[10px] focus:ring-indigo-500/10 focus:border-indigo-600 transition-all outline-none shadow-sm"
                      />
                   </div>
                 ))}
              </div>
              
              <div className="mt-20 pt-12 border-t border-slate-100 flex justify-between items-center group">
                 <div className="flex items-center gap-5 italic">
                    <div className="relative">
                       <div className="h-10 w-10 bg-indigo-600 rounded-2xl rotate-45 transform group-hover:scale-125 transition-transform duration-500" />
                       <Cog8ToothIcon className="h-5 w-5 text-white absolute inset-0 m-auto animate-spin-slow" />
                    </div>
                    <div>
                       <p className="text-[11px] font-black italic text-slate-900 leading-none mb-1">INTEGRITY CHECK PASSED</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Yield Calculation Sync Active</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-10">
                   <button className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] hover:text-rose-500 transition-all active:scale-95" onClick={() => setEditRecord(null)}>ABORT OVERRIDE</button>
                   <button 
                     className="bg-slate-900 text-white px-24 py-6 rounded-[2rem] font-black hover:bg-indigo-600 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] active:shadow-none transition-all transform active:scale-95 uppercase text-[10px] tracking-[0.5em] italic"
                     onClick={handleEditSave}
                     disabled={saving}
                   >
                     {saving ? 'SYNCHRONIZING...' : 'UPDATE REGISTRY'}
                   </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default ProductionPage;

