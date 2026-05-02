import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  ArrowLeftIcon, 
  EyeIcon, 
  PencilSquareIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  ArrowPathIcon,
  TrashIcon as WasteIcon,
  CheckCircleIcon,
  SparklesIcon,
  BoltIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

import authFetch from '../utils/authFetch';
import StatCard from '../components/ui/StatCard';
import { PageContainer, SectionCard, ModernTable } from '../components/ui/Layout';
import Modal from '../components/ui/Modal';



function CleaningPage() {
  const [batches, setBatches] = useState([]);
  const [rawInwards, setRawInwards] = useState([]);
  const [recleanBatches, setRecleanBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  // Modal state
  const [viewRecord, setViewRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVariety, setFilterVariety] = useState('All Varieties');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 10;

  const emptyForm = {
    processDate: new Date().toISOString().split('T')[0],
    shift: 'Day', inwardRef: '', paddyVariety: '', sourceGodown: '',
    rawPaddyInputKg: '', inputBags: '', preCleaningMoisturePercent: '',
    stonesKg: '0', dustKg: '0', strawKg: '0', otherWasteKg: '0',
    cleanPaddyOutputKg: '', outputBags: '', postCleaningMoisturePercent: '',
    destinationGodown: '', destinationStack: '', impurityAfter: '',
    readyForMilling: 'Yes - Send to Production', labourCount: '', labourCost: '', powerConsumption: '', remarks: '',
    inputType: 'Raw'
  };
  const [formData, setFormData] = useState(emptyForm);
  const [availableStock, setAvailableStock] = useState(0);
  const [godowns, setGodowns] = useState([]);

  const stones = parseFloat(formData.stonesKg) || 0;
  const dust = parseFloat(formData.dustKg) || 0;
  const straw = parseFloat(formData.strawKg) || 0;
  const otherWaste = parseFloat(formData.otherWasteKg) || 0;
  const totalWasteKg = stones + dust + straw + otherWaste;
  const inputWeight = parseFloat(formData.rawPaddyInputKg) || 0;
  const expectedMaxOutput = Math.max(0, inputWeight - totalWasteKg);
  const cleanOutput = parseFloat(formData.cleanPaddyOutputKg) || 0;
  const efficiencyPercent = inputWeight > 0 ? (cleanOutput / inputWeight) * 100 : 0;

  useEffect(() => { 
    fetchBatches(); 
    fetchPaddyInwards(); 
    fetchGodowns();
  }, []);

  async function fetchBatches() {
    setLoading(true);
    try {
      const res = await authFetch(`/cleaning?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&variety=${filterVariety}`);
      const result = await res.json();
      if (result.data) {
        setBatches(result.data);
        setTotalRecords(result.total);
      } else {
        setBatches(Array.isArray(result) ? result : []);
        setTotalRecords(Array.isArray(result) ? result.length : 0);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function fetchPaddyInwards() {
    try {
      const res = await authFetch('/cleaning/available-batches');
      const data = await res.json();
      setRawInwards(Array.isArray(data.rawBatches) ? data.rawBatches : []);
      setRecleanBatches(Array.isArray(data.recleanBatches) ? data.recleanBatches : []);
    } catch (e) { console.error(e); }
  }

  async function fetchGodowns() {
    try {
      const res = await authFetch('/stock/godowns');
      if (res.ok) {
        const data = await res.json();
        setGodowns(data);
      }
    } catch (e) { console.error(e); }
  }

  const handleInputChange = (e) => {
    const { name, id, value } = e.target;
    const key = name || id;
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleBatchSelection = (type, value) => {
    if (!value) {
      setFormData(prev => ({ ...prev, inwardRef: '', paddyVariety: '', sourceGodown: '', inputType: 'Raw' }));
      setAvailableStock(0);
      return;
    }
  
    const sourceList = type === 'Raw' ? rawInwards : recleanBatches;
    const selectedBatch = sourceList.find(b => b.ref === value);
  
    if (selectedBatch) {
      setFormData(prev => ({
        ...prev,
        inwardRef: selectedBatch.ref,
        paddyVariety: selectedBatch.paddy_variety,
        sourceGodown: selectedBatch.source_godown,
        inputType: type
      }));
      setAvailableStock(parseFloat(selectedBatch.available_weight_kg) || 0);
    }
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (inputWeight > availableStock) { alert(`Input exceeds available stock (${availableStock} Kg)`); return; }
    if (cleanOutput > expectedMaxOutput) { alert(`Output cannot exceed ${expectedMaxOutput.toFixed(2)} Kg!`); return; }
    const payload = {
      ...formData,
      rawPaddyInputKg: inputWeight, inputBags: parseInt(formData.inputBags) || 0,
      preCleaningMoisturePercent: parseFloat(formData.preCleaningMoisturePercent) || 0,
      stonesKg: stones, dustKg: dust, strawKg: straw, otherWasteKg: otherWaste,
      cleanPaddyOutputKg: cleanOutput, outputBags: parseInt(formData.outputBags) || 0,
      postCleaningMoisturePercent: parseFloat(formData.postCleaningMoisturePercent) || 0,
      impurityAfter: parseFloat(formData.impurityAfter) || 0,
      labourCount: parseInt(formData.labourCount) || 0, labourCost: parseFloat(formData.labourCost) || 0,
      powerConsumption: parseFloat(formData.powerConsumption) || 0,
    };
    try {
      const res = await authFetch('/cleaning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); alert('Failed: ' + (e.message || res.statusText)); return; }
      const data = await res.json();
      alert('Cleaning entry saved. Output: ' + data.cleaning.clean_output_kg + ' Kg');
      setView('list'); setFormData(emptyForm); fetchBatches(); fetchPaddyInwards();
    } catch { alert('Error connecting to backend.'); }
  }

  // --- EDIT MODAL ---
  const openEdit = (item) => {
    setEditRecord({
      id: item.id,
      processDate: item.process_date,
      shift: item.shift,
      inwardRef: item.inward_ref,
      paddyVariety: item.paddy_variety,
      sourceGodown: item.source_godown,
      rawPaddyInputKg: item.input_weight_kg,
      inputBags: item.input_bags,
      preCleaningMoisturePercent: item.pre_cleaning_moisture_percent,
      stonesKg: item.stones_kg,
      dustKg: item.dust_kg,
      strawKg: item.straw_kg,
      otherWasteKg: item.other_waste_kg,
      cleanPaddyOutputKg: item.clean_output_kg,
      outputBags: item.output_bags,
      postCleaningMoisturePercent: item.post_cleaning_moisture_percent,
      destinationGodown: item.destination_godown,
      destinationStack: item.destination_stack,
      impurityAfter: item.impurity_after_percent,
      readyForMilling: item.ready_for_milling,
      labourCount: item.labour_count,
      labourCost: item.labour_cost,
      powerConsumption: item.power_consumption,
      remarks: item.remarks,
    });
  };

  const handleEditChange = (e) => {
    const { name, id, value } = e.target;
    setEditRecord(prev => ({ ...prev, [name || id]: value }));
  };

  async function handleEditSave() {
    setSaving(true);
    try {
      const res = await authFetch(`/cleaning/${editRecord.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editRecord)
      });
      if (!res.ok) { const e = await res.json(); alert('Update failed: ' + (e.message || res.statusText)); return; }
      alert('Cleaning record updated successfully!');
      setEditRecord(null); fetchBatches();
    } catch { alert('Error connecting to backend.'); } finally { setSaving(false); }
  }

  async function handleDelete(item) {
    const isConfirmed = window.confirm(
      `⚠️ WARNING: DELETE CLEANING RECORD\n\n` +
      `Are you sure you want to PERMANENTLY delete this cleaning entry?\n\n` +
      `Batch Ref: ${item.inward_ref}\n` +
      `Process Date: ${item.process_date}\n` +
      `Input: ${parseFloat(item.input_weight_kg).toLocaleString()} Kg\n` +
      `Output: ${parseFloat(item.clean_output_kg).toLocaleString()} Kg\n\n` +
      `This will return ${parseFloat(item.input_weight_kg).toLocaleString()} Kg of paddy back to Inward Stock.\n\n` +
      `THIS ACTION CANNOT BE UNDONE.`
    );

    if (!isConfirmed) return;

    try {
      const res = await authFetch(`/cleaning/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json();
        alert('Delete failed: ' + (e.message || res.statusText));
        return;
      }
      alert('Cleaning record deleted successfully!');
      fetchBatches(); fetchPaddyInwards();
    } catch { alert('Error connecting to backend.'); }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayInward = (batches.filter(b => b.process_date === todayStr).reduce((acc, b) => acc + parseFloat(b.input_weight_kg), 0)).toLocaleString();
  const totalWaste = (batches.reduce((acc, b) => acc + parseFloat(b.total_waste_kg), 0)).toLocaleString();
  const avgEfficiency = batches.length > 0 ? (batches.reduce((acc, b) => acc + parseFloat(b.efficiency_percent), 0) / batches.length).toFixed(1) : '0.0';

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
    fetchBatches();
  }, [searchTerm, filterVariety]);

  useEffect(() => {
    fetchBatches();
  }, [currentPage]);

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">Grain Cleaning Management</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Monitor the quality and waste analysis of the cleaning process.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 transform active:scale-95"
          onClick={() => setView(view === 'list' ? 'form' : 'list')}
        >
          {view === 'list' ? (
            <>
              <PlusIcon className="h-5 w-5" />
              New Cleaning Entry
            </>
          ) : (
            <>
              <ArrowLeftIcon className="h-5 w-5" />
              Back to List
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Today's Processing" 
          value={todayInward} 
          unit="KG" 
          trend="+8%" 
          icon={ArrowPathIcon}
          colorClass="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard 
          title="Total Waste Removed" 
          value={totalWaste} 
          unit="KG" 
          trend="-2.4%" 
          icon={WasteIcon}
          colorClass="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard 
          title="Average Efficiency" 
          value={avgEfficiency} 
          unit="PERCENT" 
          trend="+0.5%" 
          icon={CheckCircleIcon}
          colorClass="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6 font-sans">
        <Modal 
          isOpen={view === 'form'} 
          onClose={() => { setView('list'); setFormData(emptyForm); }}
          title="New Cleaning Entry"
          formId="cleaningForm"
          submitText="Validate & Save Process"
        >
          <form id="cleaningForm" onSubmit={handleSubmit} className="space-y-8">
            <SectionCard title="📋 Batch Selection & Shift Details">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                <div className="space-y-2 md:col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Select Paddy Inward Batch *</label>
                      <select 
                        value={formData.inputType === 'Raw' ? formData.inwardRef : ''} 
                        onChange={(e) => handleBatchSelection('Raw', e.target.value)} 
                        required={formData.inputType === 'Raw'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-indigo-700 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select Inward No</option>
                        {rawInwards.map(inw => (
                          <option key={`raw-${inw.ref}`} value={inw.ref}>
                            {inw.ref} - {inw.supplier_name} ({parseFloat(inw.available_weight_kg).toLocaleString()} Kg)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-amber-500 uppercase tracking-widest ml-1 block mb-2">Select Re-cleaning Batch</label>
                      <select 
                        value={formData.inputType === 'Re-clean' ? formData.inwardRef : ''} 
                        onChange={(e) => handleBatchSelection('Re-clean', e.target.value)} 
                        required={formData.inputType === 'Re-clean'}
                        className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm font-black text-amber-700 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select Failed Batch</option>
                        {recleanBatches.map(batch => (
                          <option key={`reclean-${batch.ref}`} value={batch.ref}>
                            🔄 {batch.ref} ({parseFloat(batch.available_weight_kg).toLocaleString()} Kg)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Process Date *</label>
                  <input 
                    id="processDate" 
                    type="date" 
                    value={formData.processDate} 
                    onChange={handleInputChange} 
                    required 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8 pt-8 border-t border-slate-100 font-sans">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Shift Mode</span>
                  <select 
                    id="shift" 
                    value={formData.shift} 
                    onChange={handleInputChange}
                    className="w-full bg-transparent text-sm font-black text-slate-900 border-none px-0 focus:ring-0 cursor-pointer"
                  >
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
                    <option value="afternoon">Afternoon Shift </option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Variety</span>
                  <p className="text-sm font-black text-slate-900 uppercase italic">{formData.paddyVariety || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Source</span>
                  <p className="text-sm font-black text-slate-900 uppercase italic">{formData.sourceGodown || '—'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Available Stock</span>
                  <p className="text-sm font-black text-emerald-600">{availableStock.toLocaleString()} KG</p>
                </div>
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
              <SectionCard title="📥 Input Details">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Input Weight (Kg) *</label>
                    <div className="relative">
                      <input 
                        id="rawPaddyInputKg" 
                        name="rawPaddyInputKg" 
                        type="number" 
                        step="0.01" 
                        value={formData.rawPaddyInputKg} 
                        onChange={handleInputChange} 
                        placeholder="0.00" 
                        required 
                        className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 font-black text-xl outline-none transition-all ${
                          inputWeight > availableStock ? 'border-rose-500 ring-4 ring-rose-500/10 text-rose-600' : 'border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-900'
                        }`}
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KG</span>
                    </div>
                    {inputWeight > availableStock && <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter ml-1">Exceeds available batch stock!</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Input Bags</label>
                    <input 
                      id="inputBags" 
                      type="number" 
                      value={formData.inputBags} 
                      onChange={handleInputChange} 
                      placeholder="0" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="✨ Output & Storage">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1 pr-1">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Clean Output (Kg) *</label>
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, cleanPaddyOutputKg: expectedMaxOutput.toFixed(2) }))}
                        className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-all uppercase tracking-tighter"
                      >
                        Auto-fill Max
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        id="cleanPaddyOutputKg" 
                        name="cleanPaddyOutputKg" 
                        type="number" 
                        step="0.01" 
                        value={formData.cleanPaddyOutputKg} 
                        onChange={handleInputChange} 
                        required 
                        className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 font-black text-xl outline-none transition-all ${
                          cleanOutput > expectedMaxOutput ? 'border-rose-500 ring-4 ring-rose-500/10 text-rose-600' : 'border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-900'
                        }`}
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-400">KG</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Godown *</label>
                      <select id="destinationGodown" value={formData.destinationGodown} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/10">
                        <option value="">Select</option>
                        {godowns.map(g => (
                          <option key={g.name} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bin No</label>
                      <input id="destinationStack" type="text" value={formData.destinationStack} onChange={handleInputChange} placeholder="BIN-01" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-3 py-3 text-sm font-black text-slate-900" />
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="⚖️ Waste Analysis Breakdown">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 font-sans">
                {[
                  ['stonesKg', 'Stones', 'text-amber-700', 'bg-amber-50'], 
                  ['dustKg', 'Dust/Fine', 'text-slate-500', 'bg-slate-50'], 
                  ['strawKg', 'Straw/Husk', 'text-orange-700', 'bg-orange-50'], 
                  ['otherWasteKg', 'Other', 'text-rose-700', 'bg-rose-50']
                ].map(([id, label, color, bg]) => (
                  <div key={id} className="space-y-2 group">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${color} ml-1`}>{label} (KG)</label>
                    <div className="relative">
                      <input 
                        id={id} 
                        name={id} 
                        type="number" 
                        step="0.01" 
                        value={formData[id]} 
                        onChange={handleInputChange}
                        className={`w-full ${bg}/30 border-b-2 border-slate-100 group-hover:border-indigo-500 focus:border-indigo-600 px-1 py-2 text-lg font-black outline-none transition-all text-slate-900`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex items-center justify-between p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden font-sans">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="flex items-center gap-12 relative z-10">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-[0.2em] opacity-60">Waste Total</span>
                    <span className="text-4xl font-black text-white italic tracking-tighter">{totalWasteKg.toFixed(2)} <span className="text-sm font-bold text-slate-500 not-italic ml-1 uppercase">kg</span></span>
                  </div>
                  <div className="h-16 w-px bg-slate-800" />
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-[0.2em] opacity-60">Process Score</span>
                    <span className="text-4xl font-black text-emerald-400 italic tracking-tighter">{efficiencyPercent.toFixed(1)}<span className="text-sm font-bold text-slate-500 not-italic ml-1">%</span></span>
                  </div>
                </div>
                <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-xl border border-white/10 relative z-10">
                  <SparklesIcon className="h-10 w-10 text-indigo-400" />
                </div>
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
              <SectionCard title="🔬 Quality Control Parameters">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moisture Content</label>
                    <div className="relative">
                      <input id="postCleaningMoisturePercent" type="number" step="0.1" value={formData.postCleaningMoisturePercent} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900" />
                      <span className="absolute right-4 top-3 text-[10px] font-black text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Impurity Level</label>
                    <div className="relative">
                      <input id="impurityAfter" type="number" step="0.1" value={formData.impurityAfter} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900" />
                      <span className="absolute right-4 top-3 text-[10px] font-black text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Production Status</label>
                    <select id="readyForMilling" value={formData.readyForMilling} onChange={handleInputChange} className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl px-4 py-3.5 text-sm font-black text-indigo-700 italic">
                      <option>Yes - Send to Production</option>
                      <option>No - Needs Re-cleaning</option>
                      <option>Wait - Laboratory Test Pending</option>
                    </select>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="👥 Resources & Observations">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight ml-1">Team Count</label>
                    <input id="labourCount" type="number" value={formData.labourCount} onChange={handleInputChange} className="w-full bg-slate-100/50 border-transparent rounded-xl px-4 py-3 text-sm font-black text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight ml-1">Energy (Units)</label>
                    <input id="powerConsumption" type="number" step="0.1" value={formData.powerConsumption} onChange={handleInputChange} className="w-full bg-slate-100/50 border-transparent rounded-xl px-4 py-3 text-sm font-black text-slate-900" />
                  </div>
                </div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Process Notes</label>
                <textarea id="remarks" rows="2" value={formData.remarks} onChange={handleInputChange} placeholder="Any specific issues or quality notes..." className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 shadow-inner" />
              </SectionCard>
            </div>

          </form>
        </Modal>

        <SectionCard 
          title="Processing History Journal"
            actions={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search batch ref..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all w-64 font-bold text-slate-900"
                  />
                </div>
                <div className="h-6 w-px bg-slate-200 mx-1" />
                <select 
                  className="bg-slate-50 border-none text-xs font-bold text-slate-600 rounded-lg px-3 py-2 cursor-pointer outline-none"
                  value={filterVariety}
                  onChange={(e) => setFilterVariety(e.target.value)}
                >
                  <option>All Varieties</option>
                  {[...new Set(batches.map(b => b.paddy_variety))].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            }
          >
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center space-y-6">
                <div className="h-12 w-12 border-[5px] border-indigo-600 border-t-transparent rounded-full animate-spin shadow-indigo-100" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Synchronizing Data Matrix...</p>
              </div>
            ) : (
              <>
                <ModernTable headers={['Batch Date', 'Inward Ref', 'Paddy Variety', 'Input (Kg)', 'Clean Paddy (Kg)', 'Efficiency', 'Status', 'Actions']}>
                  {batches.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 group transition-all duration-200 border-b border-slate-50 last:border-0">
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500 font-black tracking-tighter">{item.process_date}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-indigo-600 inline-flex items-center gap-2">
                         <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        {item.inward_ref}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-xs text-slate-900 font-black uppercase tracking-tighter italic">{item.paddy_variety}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900 tabular-nums">{parseFloat(item.input_weight_kg).toLocaleString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-rose-500 tabular-nums">-{parseFloat(item.total_waste_kg).toLocaleString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-emerald-700 tabular-nums">{parseFloat(item.clean_output_kg).toLocaleString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-200">
                            <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(99,102,241,0.4)]" style={{ width: `${item.efficiency_percent}%` }} />
                          </div>
                          <span className="text-xs font-black text-slate-700 italic w-10">{parseFloat(item.efficiency_percent).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                         <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                           item.ready_for_milling.startsWith('Yes') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                         }`}>
                           {item.ready_for_milling.split(' - ')[0]}
                         </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 justify-end transform translate-x-4 group-hover:translate-x-0">
                          <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:rotate-6 hover:shadow-xl rounded-2xl transition-all active:scale-95" onClick={() => setViewRecord(item)}><EyeIcon className="h-4.5 w-4.5" /></button>
                          <button className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-white hover:-rotate-6 hover:shadow-xl rounded-2xl transition-all active:scale-95" onClick={() => openEdit(item)}><PencilSquareIcon className="h-4.5 w-4.5" /></button>
                          <button className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:rotate-12 hover:shadow-xl rounded-2xl transition-all active:scale-95" onClick={() => handleDelete(item)}><TrashIcon className="h-4.5 w-4.5" /></button>
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
                  <ArrowPathIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Cleaning Batch Report</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reference: {viewRecord.inward_ref} • {viewRecord.process_date}</p>
                </div>
              </div>
              <button onClick={() => setViewRecord(null)} className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all">
                <PlusIcon className="h-10 w-10 rotate-45" />
              </button>
            </div>

            <div className="p-8 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paddy Variety</span>
                  <p className="text-lg font-bold text-slate-800">{viewRecord.paddy_variety}</p>
                </div>
                <div className="space-y-1.5 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Godown</span>
                  <p className="text-lg font-bold text-slate-800">{viewRecord.source_godown}</p>
                </div>
                
                <div className="col-span-2 grid grid-cols-3 gap-6 bg-slate-50/50 border border-slate-100 rounded-2xl p-6">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">TOTAL INPUT</p>
                      <p className="text-2xl font-black text-slate-900">{parseFloat(viewRecord.input_weight_kg).toLocaleString()} <span className="text-[10px] ml-0.5">KG</span></p>
                   </div>
                   <div className="text-center border-x border-slate-200">
                      <p className="text-[10px] font-black text-rose-500 mb-1.5 uppercase tracking-widest">WASTE LOSS</p>
                      <p className="text-2xl font-black text-rose-600">-{parseFloat(viewRecord.total_waste_kg).toFixed(2)} <span className="text-[10px] ml-0.5">KG</span></p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-black text-emerald-500 mb-1.5 uppercase tracking-widest">NET OUTPUT</p>
                      <p className="text-2xl font-black text-emerald-700">{parseFloat(viewRecord.clean_output_kg).toLocaleString()} <span className="text-[10px] ml-0.5">KG</span></p>
                   </div>
                </div>

                <div className="col-span-2">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
                    Quality Parameters <div className="h-px flex-1 bg-slate-100" />
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      ['Stones', viewRecord.stones_kg, 'text-slate-800', 'bg-white'], 
                      ['Dust', viewRecord.dust_kg, 'text-slate-800', 'bg-white'], 
                      ['Straw', viewRecord.straw_kg, 'text-slate-800', 'bg-white'], 
                      ['Other', viewRecord.other_waste_kg, 'text-slate-800', 'bg-white']
                    ].map(([l, v, c, b]) => (
                      <div key={l} className={`${b} p-4 rounded-xl text-center border border-slate-100 shadow-sm`}>
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
                      <CheckCircleIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Validation Status</p>
                      <p className="text-sm font-bold text-indigo-900">{viewRecord.ready_for_milling}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Efficiency Score</p>
                    <p className="text-3xl font-black text-indigo-600">{parseFloat(viewRecord.efficiency_percent).toFixed(1)}%</p>
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
          <div className="bg-white rounded-[3.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-[0_64px_128px_-24px_rgba(0,0,0,0.4)] scale-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="h-10 w-2 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
                <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase whitespace-nowrap leading-none">
                  Registry Update <span className="text-indigo-600">MOD-{editRecord.inwardRef}</span>
                </h3>
              </div>
              <button onClick={() => setEditRecord(null)} className="text-slate-400 hover:text-slate-900 p-3 hover:bg-slate-100 rounded-full transition-all border border-slate-200">
                <PlusIcon className="h-8 w-8 rotate-45" />
              </button>
            </div>
            
            <div className="p-12 overflow-y-auto max-h-[calc(90vh-180px)] custom-scrollbar">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
                 {[
                   ['processDate','Processing Date','date'], ['shift','Work Shift','text'], 
                   ['rawPaddyInputKg','Input Weight','number'], ['inputBags','Input Bags','number'], 
                   ['stonesKg','Stones Loss','number'], ['dustKg','Dust Loss','number'], 
                   ['strawKg','Straw Loss','number'], ['otherWasteKg','Other Waste','number'], 
                   ['cleanPaddyOutputKg','Net Output','number'], ['outputBags','Out Bags','number'], 
                   ['destinationGodown','Storage Depot','text'], ['destinationStack','Bin Identifier','text']
                 ].map(([f, l, t]) => (
                   <div key={f} className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">
                        {l}
                      </label>
                      <input 
                        type={t} 
                        name={f} 
                        value={editRecord[f] ?? ''} 
                        onChange={handleEditChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-base font-black text-slate-900 focus:bg-white focus:ring-[6px] focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
                      />
                   </div>
                 ))}
                 <div className="col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">Milling Authorization Status</label>
                    <select name="readyForMilling" value={editRecord.readyForMilling} onChange={handleEditChange} className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl px-5 py-4 text-sm font-black text-indigo-700 italic cursor-pointer outline-none focus:ring-[6px] focus:ring-indigo-500/10 transition-all appearance-none shadow-sm">
                      <option>Yes - Send to Production</option>
                      <option>No - Needs Re-cleaning</option>
                      <option>Wait - Laboratory Test Pending</option>
                    </select>
                 </div>
              </div>
              
              <div className="mt-16 pt-10 border-t border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-4 text-rose-500 font-bold bg-rose-50 px-6 py-3 rounded-2xl shadow-inner border border-rose-100/50">
                    <div className="h-5 w-5 bg-rose-500 rounded-full animate-ping opacity-20 absolute" />
                    <WasteIcon className="h-5 w-5 relative" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Registry Synchronization Active</span>
                 </div>
                 <div className="flex items-center gap-8">
                   <button className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-slate-900 transition-colors" onClick={() => setEditRecord(null)}>Rollback Changes</button>
                   <button 
                     className="bg-slate-900 text-white px-20 py-5 rounded-[1.5rem] font-black hover:bg-indigo-600 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] active:shadow-none disabled:opacity-50 transition-all transform active:scale-95 uppercase text-xs tracking-[0.4em]"
                     onClick={handleEditSave}
                     disabled={saving}
                   >
                     {saving ? 'Synchronizing...' : 'Finalize & Publish'}
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

export default CleaningPage;

