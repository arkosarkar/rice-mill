import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  ArrowLeftIcon, 
  EyeIcon, 
  PencilSquareIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  TruckIcon,
  ScaleIcon,
  BeakerIcon,
  BanknotesIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

import authFetch from '../utils/authFetch';
import PartyModal from '../components/PartyModal';
import StatCard from '../components/ui/StatCard';
import { PageContainer, SectionCard, ModernTable } from '../components/ui/Layout';
import Modal from '../components/ui/Modal';

function PaddyInwardPage() {
  const [inwards, setInwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'form'
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [parties, setParties] = useState([]);
  const [showAddParty, setShowAddParty] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [godowns, setGodowns] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterVariety, setFilterVariety] = useState('All Varieties');
  const [netWeightManual, setNetWeightManual] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 10;
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, suppliers: 0 });

  // Form State
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    entryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    inwardNo: `INW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierName: '',
    partyId: null,
    contactNumber: '',
    village: '',
    paddyVariety: '',
    grossWeightKg: '',
    tareWeightKg: '',
    numberOfBags: '',
    bagWeightKg: '50',
    moisturePercent: '',
    brokenPercent: '',
    impurityPercent: '',
    ratePerKg: '',
    deductions: '',
    paymentMode: '',
    advancePaid: '',
    vehicleNumber: '',
    driverName: '',
    transportCharges: '',
    godown: '',
    lotNumber: '',
    stackNumber: '',
    remarks: '',
    gstRate: '0'
  });

  // Auto-calculate net weight when gross or tare changes (unless manually entered)
  useEffect(() => {
    if (!netWeightManual) {
      const gross = parseFloat(formData.grossWeightKg) || 0;
      const tare = parseFloat(formData.tareWeightKg) || 0;
      const calculated = Math.max(gross - tare, 0);
      setFormData(prev => ({ ...prev, netWeightKg: calculated ? calculated.toFixed(2) : '' }));
    }
  }, [formData.grossWeightKg, formData.tareWeightKg, netWeightManual]);

  // Auto-calc for edit modal
  useEffect(() => {
    if (editingRecord && !netWeightManual) {
      const gross = parseFloat(editingRecord.grossWeightKg) || 0;
      const tare = parseFloat(editingRecord.tareWeightKg) || 0;
      const calculated = Math.max(gross - tare, 0);
      setEditingRecord(prev => ({ ...prev, netWeightKg: calculated ? calculated.toFixed(2) : '' }));
    }
  }, [editingRecord?.grossWeightKg, editingRecord?.tareWeightKg, netWeightManual]);

  // Calculated values
  const netWeightKg = parseFloat(formData.netWeightKg) || 0;
  const ratePerKgVal = parseFloat(formData.ratePerKg) || 0;
  const rawPurchaseAmount = netWeightKg * ratePerKgVal;
  
  const gstRateVal = parseFloat(formData.gstRate) || 0;
  const gstAmount = (rawPurchaseAmount * gstRateVal) / 100;
  
  const totalAmount = rawPurchaseAmount + gstAmount - (parseFloat(formData.deductions) || 0);
  const payableAmount = totalAmount;
  const balanceAmount = payableAmount - (parseFloat(formData.advancePaid) || 0);

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
    fetchInwards();
  }, [searchTerm, filterVariety]);

  useEffect(() => {
    fetchInwards();
  }, [currentPage]);

  const fetchParties = async () => {
    try {
      const res = await authFetch('/parties?type=Farmer');
      if (res.ok) setParties(await res.json());
    } catch (err) {
      console.error('Failed to fetch parties', err);
    }
  };

  const fetchGodowns = async () => {
    try {
      const res = await authFetch('/stock/godowns');
      if (res.ok) setGodowns(await res.json());
    } catch (err) {
      console.error('Failed to fetch godowns', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/paddy-inwards/stats');
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  useEffect(() => {
    fetchInwards();
    fetchParties();
    fetchGodowns();
    fetchStats();
  }, []);

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedRecord(null);
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setNetWeightManual(false); // Reset manual override on edit
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingRecord(null);
  };

  async function handleUpdate(event) {
    event.preventDefault();
    if (!editingRecord) return;

    const payload = {
      ...editingRecord,
      grossWeightKg: parseFloat(editingRecord.grossWeightKg) || 0,
      tareWeightKg: parseFloat(editingRecord.tareWeightKg) || 0,
      numberOfBags: parseInt(editingRecord.numberOfBags, 10) || 0,
      bagWeightKg: parseFloat(editingRecord.bagWeightKg) || 0,
      moisturePercent: parseFloat(editingRecord.moisturePercent) || 0,
      brokenPercent: parseFloat(editingRecord.brokenPercent) || 0,
      impurityPercent: parseFloat(editingRecord.impurityPercent) || 0,
      ratePerKg: parseFloat(editingRecord.ratePerKg) || 0,
      deductions: parseFloat(editingRecord.deductions) || 0,
      advancePaid: parseFloat(editingRecord.advancePaid) || 0,
      transportCharges: parseFloat(editingRecord.transportCharges) || 0,
    };

    try {
      const response = await authFetch(`/paddy-inwards/${editingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert('Failed to update: ' + (errorData.message || response.statusText));
        return;
      }

      alert('Paddy inward updated successfully!');
      closeEditModal();
      fetchInwards();
      fetchStats();
    } catch (error) {
      // Global handler in authFetch will show the notification
    }
  }

  const handleEditInputChange = (e) => {
    const { id, value } = e.target;
    setEditingRecord(prev => ({ ...prev, [id]: value }));
  };

  const handleDeleteRecord = async (record) => {
    const isConfirmed = window.confirm(
      `⚠️ WARNING: DELETE RECORD\n\n` +
      `Are you sure you want to PERMANENTLY delete this record?\n\n` +
      `Inward No: ${record.inwardNo}\n` +
      `Supplier: ${record.supplierName}\n` +
      `Amount: ₹${parseFloat(record.payableAmount).toLocaleString()}\n\n` +
      `This will also:\n` +
      `1. Delete associated financial transactions.\n` +
      `2. Update the supplier's outstanding balance.\n\n` +
      `THIS ACTION CANNOT BE UNDONE.`
    );
    
    if (!isConfirmed) return;
    
    try {
      const response = await authFetch(`/paddy-inwards/${record.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errMsg = response.statusText;
        try {
          const errorData = await response.json();
          errMsg = errorData.message || errMsg;
        } catch(e) {
          // If the server returns HTML (like a 404 Cannot DELETE), json parsing fails.
          if (response.status === 404) errMsg = "Delete Route not found. Server needs a restart.";
        }
        alert('Failed to delete: ' + errMsg);
        return;
      }

      alert('Record deleted successfully!');
      fetchInwards();
      fetchStats();
    } catch (error) {
      // Global handler in authFetch will show the notification
    }
  };

  async function fetchInwards() {
    setLoading(true);
    try {
      const response = await authFetch(`/paddy-inwards?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&variety=${filterVariety}`);
      const result = await response.json();
      if (result.data) {
        setInwards(result.data);
        setTotalRecords(result.total);
      } else {
        setInwards(Array.isArray(result) ? result : []);
        setTotalRecords(Array.isArray(result) ? result.length : 0);
      }
    } catch (error) {
      console.error('Failed to fetch inwards', error);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === 'netWeightKg') {
      setNetWeightManual(value !== ''); // Re-enable auto calc if cleared
    }
    
    // Auto-fill mobile and village when selecting a party from dropdown
    if (id === 'supplierName') {
      const selectedParty = parties.find(p => p.name === value);
      if (selectedParty) {
        setFormData(prev => ({ 
          ...prev, 
          supplierName: value,
          partyId: selectedParty.id,
          contactNumber: selectedParty.mobile_number || prev.contactNumber,
          village: selectedParty.address || prev.village
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handlePartySaved = (newParty) => {
    setFormData(prev => ({ 
      ...prev, 
      supplierName: newParty.name,
      partyId: newParty.id,
      contactNumber: newParty.mobile_number || prev.contactNumber, 
      village: newParty.address || prev.village 
    }));
    setSupplierSearch(newParty.name);
    setShowAddParty(false);
    fetchParties();
  };

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...formData,
      netWeightKg: parseFloat(formData.netWeightKg) || Math.max((parseFloat(formData.grossWeightKg) || 0) - (parseFloat(formData.tareWeightKg) || 0), 0),
      grossWeightKg: parseFloat(formData.grossWeightKg) || 0,
      tareWeightKg: parseFloat(formData.tareWeightKg) || 0,
      numberOfBags: parseInt(formData.numberOfBags, 10) || 0,
      bagWeightKg: parseFloat(formData.bagWeightKg) || 0,
      moisturePercent: parseFloat(formData.moisturePercent) || 0,
      brokenPercent: parseFloat(formData.brokenPercent) || 0,
      impurityPercent: parseFloat(formData.impurityPercent) || 0,
      ratePerKg: parseFloat(formData.ratePerKg) || 0,
      deductions: parseFloat(formData.deductions) || 0,
      advancePaid: parseFloat(formData.advancePaid) || 0,
      transportCharges: parseFloat(formData.transportCharges) || 0,
    };

    try {
      const response = await authFetch('/paddy-inwards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert('Failed to save: ' + (errorData.error || errorData.message || response.statusText));
        return;
      }

      const data = await response.json();
      alert(
        'Paddy inward saved successfully! Net weight: ' +
        data.inward.netWeightKg +
        ' Kg'
      );
      await fetchInwards();
      await fetchStats();
      setView('list');
      // Reset form
      setFormData({
        ...formData,
        inwardNo: `INW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierName: '',
        grossWeightKg: '',
        tareWeightKg: '',
        // keep some defaults
      });
    } catch (error) {
      // Global handler in authFetch will show the notification
    }
  }

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paddy Inward Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage incoming paddy from farmers and suppliers.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          onClick={() => {
            setView(view === 'list' ? 'form' : 'list');
            if (view === 'list') setSupplierSearch('');
          }}
        >
          {view === 'list' ? (
            <>
              <PlusIcon className="h-5 w-5" />
              New Inward Entry
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
          title="Today's Inward" 
          value={stats.today.toLocaleString()} 
          unit="KG" 
          trend="TODAY" 
          icon={CalendarDaysIcon}
          colorClass="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard 
          title="This Week" 
          value={stats.week.toLocaleString()} 
          unit="KG" 
          trend="THIS WEEK" 
          icon={ScaleIcon}
          colorClass="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard 
          title="This Month" 
          value={stats.month.toLocaleString()} 
          unit="KG" 
          trend="THIS MONTH" 
          icon={TruckIcon}
          colorClass="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatCard 
          title="Total Suppliers" 
          value={stats.suppliers} 
          unit="ACTIVE" 
          trend="ALL TIME" 
          icon={UserGroupIcon}
          colorClass="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
        <Modal 
          isOpen={view === 'form'} 
          onClose={() => { setView('list'); setFormData(emptyForm); }}
          title="Paddy Inward Entry"
          formId="paddyForm"
          submitText="Save Inward Entry"
        >
          <form id="paddyForm" onSubmit={handleSubmit} className="space-y-8">
            <SectionCard title="📋 Basic Information">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Entry Date *</label>
                  <input 
                    id="entryDate" 
                    type="date" 
                    value={formData.entryDate} 
                    onChange={handleInputChange} 
                    required 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-base focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Inward No. *</label>
                  <input 
                    id="inwardNo" 
                    type="text" 
                    value={formData.inwardNo} 
                    readOnly 
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Entry Time</label>
                  <input 
                    id="entryTime" 
                    type="time" 
                    value={formData.entryTime} 
                    onChange={handleInputChange} 
                    required 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="👤 Supplier & Farmer Details" className="relative z-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-gray-700">Supplier Name *</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={supplierSearch || formData.supplierName}
                        onChange={e => {
                          setSupplierSearch(e.target.value);
                          setShowSupplierDropdown(true);
                          if (!e.target.value) {
                            setFormData(prev => ({ ...prev, supplierName: '', partyId: null }));
                          }
                        }}
                        onFocus={() => setShowSupplierDropdown(true)}
                        onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                        placeholder="Search or select farmer..."
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      />
                      {showSupplierDropdown && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl mt-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {parties
                            .filter(p => p.name.toLowerCase().includes((supplierSearch || '').toLowerCase()) || (p.mobile_number || '').includes(supplierSearch || ''))
                            .map(p => (
                              <div
                                key={p.id}
                                onMouseDown={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    supplierName: p.name,
                                    partyId: p.id,
                                    contactNumber: p.mobile_number || prev.contactNumber,
                                    village: p.address || prev.village
                                  }));
                                  setSupplierSearch(p.name);
                                  setShowSupplierDropdown(false);
                                }}
                                className="px-4 py-3 cursor-pointer hover:bg-indigo-50 flex justify-between items-center transition-colors border-b border-gray-50 last:border-0"
                              >
                                <span className="font-semibold text-gray-900">{p.name}</span>
                                {p.mobile_number && <span className="text-xs text-gray-500 font-medium">📞 {p.mobile_number}</span>}
                              </div>
                            ))
                          }
                          {parties.filter(p => p.name.toLowerCase().includes((supplierSearch || '').toLowerCase())).length === 0 && (
                            <div className="px-4 py-4 text-sm text-gray-500 text-center italic">
                              No farmers found. Click ➕ New to add.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowAddParty(true)}
                      className="bg-white border border-gray-200 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-indigo-600"
                      title="Add New Party"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {formData.partyId && (
                    <p className="text-[11px] font-bold text-green-600 mt-1 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-green-600" />
                      Linked to Party Master (ID: {formData.partyId})
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Contact Number</label>
                  <input 
                    id="contactNumber" 
                    type="tel" 
                    value={formData.contactNumber} 
                    onChange={handleInputChange} 
                    placeholder="9876543210" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Village/Location</label>
                  <input 
                    id="village" 
                    type="text" 
                    value={formData.village} 
                    onChange={handleInputChange} 
                    placeholder="Enter village name" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="🌾 Paddy Weight Details">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Paddy Variety *</label>
                  <select 
                    id="paddyVariety" 
                    value={formData.paddyVariety} 
                    onChange={handleInputChange} 
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Variety</option>
                    <option>PR 11</option>
                    <option>PR 14</option>
                    <option>PR 121</option>
                    <option>Basmati 1121</option>
                    <option>Sona Masoori</option>
                    <option>Swarna</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Gross Weight (Kg) *</label>
                  <div className="relative">
                    <input 
                      id="grossWeightKg" 
                      type="number" 
                      step="0.01" 
                      value={formData.grossWeightKg} 
                      onChange={handleInputChange} 
                      placeholder="0.00" 
                      required 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-2.5 text-xs font-bold text-gray-400">KG</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Tare Weight (Kg)</label>
                  <div className="relative">
                    <input 
                      id="tareWeightKg" 
                      type="number" 
                      step="0.01" 
                      value={formData.tareWeightKg} 
                      onChange={handleInputChange} 
                      placeholder="0.00" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-2.5 text-xs font-bold text-gray-400">KG</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-50">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Net Weight (Kg) *</label>
                  <div className="relative">
                    <input 
                      id="netWeightKg" 
                      type="number" 
                      step="0.01" 
                      value={formData.netWeightKg || ''} 
                      onChange={handleInputChange} 
                      placeholder="Auto-calculated" 
                      className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-2.5 text-sm text-indigo-700 font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-2.5 text-xs font-bold text-indigo-300">KG</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Number of Bags</label>
                  <input 
                    id="numberOfBags" 
                    type="number" 
                    value={formData.numberOfBags} 
                    onChange={handleInputChange} 
                    placeholder="0" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Bag Weight (Kg)</label>
                  <input 
                    id="bagWeightKg" 
                    type="number" 
                    value={formData.bagWeightKg} 
                    onChange={handleInputChange} 
                    placeholder="50" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="🔬 Quality Inspection">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100/50 flex flex-col items-center">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Moisture Content</span>
                  <div className="flex items-center gap-2">
                    <input
                      id="moisturePercent"
                      type="number"
                      step="0.1"
                      value={formData.moisturePercent}
                      onChange={handleInputChange}
                      placeholder="0.0"
                      className="bg-transparent text-2xl font-bold text-indigo-900 border-none outline-none w-20 text-center focus:ring-0"
                    />
                    <span className="text-xl font-bold text-indigo-300">%</span>
                  </div>
                </div>
                <div className="bg-orange-50/30 p-6 rounded-2xl border border-orange-100/50 flex flex-col items-center">
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Broken Percentage</span>
                  <div className="flex items-center gap-2">
                    <input
                      id="brokenPercent"
                      type="number"
                      step="0.1"
                      value={formData.brokenPercent}
                      onChange={handleInputChange}
                      placeholder="0.0"
                      className="bg-transparent text-2xl font-bold text-orange-900 border-none outline-none w-20 text-center focus:ring-0"
                    />
                    <span className="text-xl font-bold text-orange-300">%</span>
                  </div>
                </div>
                <div className="bg-purple-50/30 p-6 rounded-2xl border border-purple-100/50 flex flex-col items-center">
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">Impurity Level</span>
                  <div className="flex items-center gap-2">
                    <input
                      id="impurityPercent"
                      type="number"
                      step="0.1"
                      value={formData.impurityPercent}
                      onChange={handleInputChange}
                      placeholder="0.0"
                      className="bg-transparent text-2xl font-bold text-purple-900 border-none outline-none w-20 text-center focus:ring-0"
                    />
                    <span className="text-xl font-bold text-purple-300">%</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="💰 Financial Settlement">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Rate per Kg (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-xs font-bold text-gray-400">₹</span>
                    <input 
                      id="ratePerKg" 
                      type="number" 
                      step="0.01" 
                      value={formData.ratePerKg} 
                      onChange={handleInputChange} 
                      placeholder="0.00" 
                      required 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Total Purchase Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-xs font-bold text-gray-400">₹</span>
                    <input 
                      id="totalAmount" 
                      type="number" 
                      value={totalAmount.toFixed(2)} 
                      readOnly 
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm text-gray-700 font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Deductions (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-xs font-bold text-red-300">₹</span>
                    <input 
                      id="deductions" 
                      type="number" 
                      step="0.01" 
                      value={formData.deductions} 
                      onChange={handleInputChange} 
                      placeholder="Commission, etc." 
                      className="w-full bg-red-50/10 border border-red-100 rounded-xl pl-8 pr-4 py-2.5 text-sm text-red-600 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-50 mb-8">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Payment Mode *</label>
                  <select 
                    id="paymentMode" 
                    value={formData.paymentMode} 
                    onChange={handleInputChange} 
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Mode</option>
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                    <option>Credit (To be paid)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Advance Paid (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-xs font-bold text-gray-400">₹</span>
                    <input 
                      id="advancePaid" 
                      type="number" 
                      step="0.01" 
                      value={formData.advancePaid} 
                      onChange={handleInputChange} 
                      placeholder="0.00" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                  </div>
                </div>
                <div></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-50">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">GST Rate (%)</label>
                  <select 
                    id="gstRate" 
                    value={formData.gstRate} 
                    onChange={handleInputChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5%</option>
                    <option value="18">18%</option>
                    <option value="40">40%</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">GST Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-xs font-bold text-gray-400">₹</span>
                    <input 
                      id="gstAmount" 
                      type="number" 
                      value={gstAmount.toFixed(2)} 
                      readOnly 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm text-gray-700 font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Balance Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-xs font-bold text-green-400">₹</span>
                    <input 
                      id="balanceAmount" 
                      type="number" 
                      value={balanceAmount.toFixed(2)} 
                      readOnly 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm text-green-700 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <SectionCard title="🚚 Logistics">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Vehicle Number</label>
                    <input 
                      id="vehicleNumber" 
                      type="text" 
                      value={formData.vehicleNumber} 
                      onChange={handleInputChange} 
                      placeholder="UP32AB1234" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Driver Name</label>
                      <input 
                        id="driverName" 
                        type="text" 
                        value={formData.driverName} 
                        onChange={handleInputChange} 
                        placeholder="Enter driver name" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Freight (₹)</label>
                      <input 
                        id="transportCharges" 
                        type="number" 
                        step="0.01" 
                        value={formData.transportCharges} 
                        onChange={handleInputChange} 
                        placeholder="0.00" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="🏭 Storage Analysis">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Godown Location *</label>
                    <select 
                      id="godown" 
                      value={formData.godown} 
                      onChange={handleInputChange} 
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select Godown</option>
                      {godowns.map(g => (
                        <option key={g.name} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Bin/Lot No.</label>
                      <input 
                        id="lotNumber" 
                        type="text" 
                        value={formData.lotNumber} 
                        onChange={handleInputChange} 
                        placeholder="BIN-01" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Stack No.</label>
                      <input 
                        id="stackNumber" 
                        type="text" 
                        value={formData.stackNumber} 
                        onChange={handleInputChange} 
                        placeholder="STK-01" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="📝 Additional Remarks">
              <textarea
                id="remarks"
                rows="3"
                value={formData.remarks}
                onChange={handleInputChange}
                placeholder="Any additional information, special instructions, etc..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
              />
            </SectionCard>

          </form>
        </Modal>

        <SectionCard 
          title="Paddy Inward Records"
            actions={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all w-64"
                  />
                </div>
                <div className="h-6 w-px bg-gray-200 mx-1" />
                <select 
                  className="bg-gray-50 border-none text-xs font-bold text-gray-600 rounded-lg px-3 py-2 cursor-pointer outline-none"
                  value={filterVariety}
                  onChange={(e) => setFilterVariety(e.target.value)}
                >
                  <option>All Varieties</option>
                  {[...new Set(inwards.map(i => i.paddyVariety))].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            }
          >
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-500">Synchronizing records...</p>
              </div>
            ) : (
              <>
                <ModernTable headers={['Date', 'Supplier', 'Variety', 'Total Wt', 'Available', 'Moisture', 'Rate', 'Amount', 'Status', 'Actions']}>
                  {inwards.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{item.entryDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.supplierName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{item.paddyVariety}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{parseFloat(item.netWeightKg).toLocaleString()} <span className="text-[10px] text-gray-400">KG</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-bold ${parseFloat(item.availableWeightKg) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {parseFloat(item.availableWeightKg).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">KG</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.moisturePercent}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">₹{item.ratePerKg}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">₹{parseFloat(item.payableAmount).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {parseFloat(item.availableWeightKg) <= 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                            <span className="h-1 w-1 rounded-full bg-gray-400" />
                            Processed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                            <span className="h-1 w-1 rounded-full bg-green-600 animate-pulse" />
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                            onClick={() => handleViewRecord(item)}
                            title="View Details"
                          >
                            <EyeIcon className="h-4.5 w-4.5" />
                          </button>
                          <button 
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" 
                            onClick={() => handleEditRecord(item)}
                            title="Edit Record"
                          >
                            <PencilSquareIcon className="h-4.5 w-4.5" />
                          </button>
                          <button 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                            onClick={() => handleDeleteRecord(item)}
                            title="Delete Record"
                          >
                            <TrashIcon className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inwards.length === 0 && (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center text-sm text-gray-500 italic bg-gray-50/30">
                        No paddy inward records found in the database.
                      </td>
                    </tr>
                  )}
                </ModernTable>
                {/* Pagination UI */}
                {totalPages > 1 && (
                  <div className="px-8 py-4 border-t border-gray-50 flex items-center justify-between">
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
                          currentPage === 1 
                            ? 'text-slate-300 cursor-not-allowed' 
                            : 'text-slate-600 hover:text-indigo-600 active:scale-95'
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
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110'
                                : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'
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
                          currentPage === totalPages 
                            ? 'text-slate-300 cursor-not-allowed' 
                            : 'text-slate-600 hover:text-indigo-600 active:scale-95'
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

      {/* Modern Modal Templates */}
      {viewModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeViewModal}>
          <div className="bg-white rounded-[2rem] w-full max-w-7xl max-h-[100vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100/50">
                  <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Inward Record Details</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{selectedRecord.inwardNo} • {selectedRecord.entryDate}</p>
                </div>
              </div>
              <button onClick={closeViewModal} className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all">
                <PlusIcon className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest pl-1">Supplier Details</h4>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400 font-medium">Name</span>
                      <span className="text-sm font-bold text-slate-900">{selectedRecord.supplierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400 font-medium">Village</span>
                      <span className="text-sm font-bold text-slate-900">{selectedRecord.village || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest pl-1">Storage & Logistics</h4>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400 font-medium tracking-tight">Godown / Bin</span>
                      <span className="text-sm font-bold text-slate-900">{selectedRecord.godown} <span className="text-[10px] text-slate-400 font-normal">({selectedRecord.lotNumber || '-'})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400 font-medium tracking-tight">Vehicle No.</span>
                      <span className="text-sm font-bold text-slate-900">{selectedRecord.vehicleNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400 font-medium tracking-tight">Driver</span>
                      <span className="text-sm font-bold text-slate-900">{selectedRecord.driverName || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 space-y-4">
                  <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest pl-1">Paddy & Weight Analysis</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-4 rounded-xl">
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Variety</p>
                       <p className="text-sm font-black text-slate-900 leading-tight">{selectedRecord.paddyVariety}</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Scale Metrics</p>
                       <p className="text-sm font-bold text-slate-900 uppercase italic leading-tight">
                         G: {selectedRecord.grossWeightKg} <span className="text-[10px] font-normal text-slate-400 ml-1">/</span> T: {selectedRecord.tareWeightKg}
                       </p>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
                       <p className="text-[9px] font-bold text-indigo-400 uppercase mb-1">Net Weight</p>
                       <p className="text-sm font-black text-indigo-600">{parseFloat(selectedRecord.netWeightKg).toLocaleString()} KG</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Packaging</p>
                       <p className="text-sm font-bold text-slate-900 leading-tight">{selectedRecord.numberOfBags} <span className="text-[10px] uppercase">Bags</span></p>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
                       <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">Quality</p>
                       <p className="text-sm font-bold text-blue-600 leading-tight">M: {selectedRecord.moisturePercent}% <span className="text-[10px] font-normal text-slate-300 ml-1">/</span> B: {selectedRecord.brokenPercent}%</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Entry Clock</p>
                       <p className="text-sm font-bold text-slate-500 uppercase leading-tight italic">{selectedRecord.entryTime || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 space-y-4">
                  <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest pl-1">Financial Summary</h4>
                  <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-6">
                    <div className="grid grid-cols-2 gap-y-6">
                      <div className="flex justify-between items-center bg-white px-5 py-3 rounded-xl border border-indigo-100/30">
                        <span className="text-xs text-slate-500 font-medium">Rate / Kg</span>
                        <span className="text-base font-bold text-slate-900">₹{selectedRecord.ratePerKg}</span>
                      </div>
                      <div className="flex justify-between items-center ml-8 border-b border-indigo-100/50 pb-2">
                        <span className="text-xs text-slate-500 font-medium">Advance Paid</span>
                        <span className="text-base font-bold text-slate-900">₹{parseFloat(selectedRecord.advancePaid || 0).toLocaleString()}</span>
                      </div>
                      
                      <div className="col-span-2 pt-4 flex justify-between items-end border-t border-indigo-100/50 mt-2">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bill Value</p>
                          <p className="text-xl font-bold text-slate-900 italic">₹{parseFloat(selectedRecord.payableAmount).toLocaleString()}</p>
                        </div>
                        <div className="bg-indigo-600 px-8 py-5 rounded-[2rem] text-right shadow-xl shadow-indigo-100 flex flex-col items-end">
                          <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.4em] mb-1 leading-none">Net Balance Payable</p>
                          <p className="text-4xl font-black text-white leading-none tracking-tighter">
                            ₹{parseFloat(selectedRecord.balanceAmount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={closeViewModal}
                className="bg-white border border-slate-200 text-slate-600 font-bold px-6 py-2.5 rounded-xl hover:bg-slate-100 transition-all text-sm"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Logic kept same, UI modernized) */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-all" onClick={closeEditModal}>
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Inward Record</h2>
                <p className="text-xs text-gray-500 font-medium">#{editingRecord.inwardNo} • Last modified by System</p>
              </div>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-900 p-2">
                <PlusIcon className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
              <form onSubmit={handleUpdate} className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Gross Weight</label>
                    <input id="grossWeightKg" type="number" step="0.01" value={editingRecord.grossWeightKg} onChange={handleEditInputChange} className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2 font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Tare Weight</label>
                    <input id="tareWeightKg" type="number" step="0.01" value={editingRecord.tareWeightKg} onChange={handleEditInputChange} className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2 font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Net Weight</label>
                    <input id="netWeightKg" type="number" step="0.01" value={editingRecord.netWeightKg} onChange={handleEditInputChange} className="w-full bg-indigo-50/50 border-none rounded-xl px-4 py-2 font-bold text-indigo-600 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Moisture %</label>
                    <input id="moisturePercent" type="number" step="0.1" value={editingRecord.moisturePercent} onChange={handleEditInputChange} className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2 font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-gray-50">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Rate per Kg</label>
                    <input id="ratePerKg" type="number" step="0.01" value={editingRecord.ratePerKg} onChange={handleEditInputChange} className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2 font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Deductions</label>
                    <input id="deductions" type="number" step="0.01" value={editingRecord.deductions} onChange={handleEditInputChange} className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2 font-bold text-red-600 focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Advance Paid</label>
                    <input id="advancePaid" type="number" step="0.01" value={editingRecord.advancePaid} onChange={handleEditInputChange} className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2 font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex justify-between items-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-16 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2 opacity-60">Total Bill (After Deductions)</p>
                      <p className="text-2xl font-black italic tracking-tighter">₹{(
                        ((parseFloat(editingRecord.netWeightKg) || 0) * (parseFloat(editingRecord.ratePerKg) || 0)) - (parseFloat(editingRecord.deductions) || 0)
                      ).toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] mb-2">Net Balance Due</p>
                      <p className="text-4xl font-black italic tracking-tighter text-indigo-400">₹{(
                        ((parseFloat(editingRecord.netWeightKg) || 0) * (parseFloat(editingRecord.ratePerKg) || 0)) - (parseFloat(editingRecord.deductions) || 0) - (parseFloat(editingRecord.advancePaid) || 0)
                      ).toLocaleString()}</p>
                   </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={closeEditModal} className="px-6 py-2 font-bold text-gray-500">Cancel</button>
                  <button type="submit" className="bg-indigo-600 text-white px-10 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Update Record</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PartyModal Integration */}
      {showAddParty && (
        <PartyModal
          isOpen={showAddParty}
          onClose={() => setShowAddParty(false)}
          onSave={handlePartySaved}
          initialType="Farmer"
        />
      )}
    </PageContainer>
  );
}

export default PaddyInwardPage;
