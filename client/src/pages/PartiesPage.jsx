import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import authFetch from '../utils/authFetch';
import PartyMigrationModal from '../components/PartyMigrationModal';
import PartyModal from '../components/PartyModal';
import StatCard from '../components/ui/StatCard';
import { PageContainer, SectionCard, ModernTable } from '../components/ui/Layout';

import { API_URL } from '../api/config';

const TYPE_STYLES = {
  Farmer:   'bg-emerald-50 text-emerald-700 border-emerald-100',
  Customer: 'bg-indigo-50  text-indigo-700  border-indigo-100',
  Both:     'bg-amber-50   text-amber-700   border-amber-100',
};

function PartiesPage() {
  const [parties, setParties] = useState([]);
  const [editingParty, setEditingParty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => { fetchParties(); }, [filterType]);

  async function fetchParties() {
    try {
      const url = filterType === 'All' ? '/parties' : `/parties?type=${filterType}`;
      const res = await authFetch(url);
      if (res.ok) setParties(await res.json());
    } catch (err) { console.error('Failed to fetch parties', err); }
  }

  const handleEdit = (p) => { setEditingParty(p); setShowModal(true); };

  const handleDelete = async (p) => {
    const isConfirmed = window.confirm(
      `⚠️ WARNING: DELETE PARTY\n\nAre you sure you want to PERMANENTLY delete this party?\n\nName: ${p.name}\nType: ${p.type}\nBalance: ₹${Math.abs(p.ledger_balance || 0).toFixed(2)}\n\nThis will also DELETE the linked ledger account.\nDeletion will be BLOCKED if this party has active records in Paddy Inward or Sales.\n\nTHIS ACTION CANNOT BE UNDONE.`
    );
    if (!isConfirmed) return;
    try {
      const res = await authFetch(`/parties/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { alert('Party and linked ledger deleted successfully!'); fetchParties(); }
      else alert('Failed to delete: ' + (data.message || data.error));
    } catch (err) { console.error('Deletion failed', err); alert('Error connecting to backend.'); }
  };

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.mobile_number || '').includes(searchTerm)
  );

  const farmers   = parties.filter(p => p.type === 'Farmer' || p.type === 'Both').length;
  const customers = parties.filter(p => p.type === 'Customer' || p.type === 'Both').length;
  const linked    = parties.filter(p => p.ledger_id).length;

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">Parties Master</h1>
          <p className="text-sm text-slate-500 mt-1 italic font-medium">Manage farmers, customers and their linked ledger accounts.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-black hover:bg-slate-50 transition-all shadow-sm transform active:scale-95 uppercase text-[10px] tracking-widest"
          >
            <ArrowDownTrayIcon className="h-4 w-4" /> Import Data
          </button>
          <button
            onClick={() => { setEditingParty(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 transform active:scale-95 uppercase text-xs tracking-widest"
          >
            <PlusIcon className="h-5 w-5" /> Add New Party
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Parties"    value={parties.length}   unit="REGISTERED" trend="ALL"     icon={UsersIcon}             colorClass="text-indigo-600"  iconBg="bg-indigo-50" />
        <StatCard title="Farmers"          value={farmers}          unit="SUPPLIERS"  trend="ACTIVE"  icon={IdentificationIcon}    colorClass="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Customers"        value={customers}        unit="BUYERS"     trend="ACTIVE"  icon={BuildingStorefrontIcon} colorClass="text-amber-600"   iconBg="bg-amber-50" />
        <StatCard title="Ledger Linked"    value={linked}           unit="ACCOUNTS"   trend="SYNCED"  icon={UsersIcon}             colorClass="text-violet-600"  iconBg="bg-violet-50" />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
        <SectionCard title="Party Registry">
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or mobile..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-2.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-700 outline-none"
            >
              <option value="All">All Types</option>
              <option value="Farmer">Farmers</option>
              <option value="Customer">Customers</option>
              <option value="Both">Both</option>
            </select>
          </div>

          <ModernTable headers={['Name', 'Type', 'Mobile', 'Address', 'GST Status', 'Ledger Balance', 'Link Status', 'Actions']}>
            {filteredParties.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-20 text-center font-black text-slate-300 uppercase italic text-[10px] tracking-[0.3em]">
                  No parties found
                </td>
              </tr>
            ) : filteredParties.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 group transition-all duration-200">
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-sm font-black text-slate-900">{p.name}</span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${TYPE_STYLES[p.type] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                    {p.type}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-500 tabular-nums">
                  {p.mobile_number || <span className="text-slate-300 italic">—</span>}
                </td>
                <td className="px-6 py-5 text-sm text-slate-500 font-medium max-w-[180px] truncate">
                  {p.address || <span className="text-slate-300 italic">—</span>}
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  {p.gst_status === 'Registered'
                    ? <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">{p.gst_number}</span>
                    : <span className="text-[9px] font-black text-slate-400 uppercase italic">Unregistered</span>
                  }
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className={`text-sm font-black tabular-nums ${p.ledger_balance > 0 ? 'text-emerald-600' : p.ledger_balance < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    ₹{Math.abs(p.ledger_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-[9px] ml-1 uppercase font-black opacity-60">
                      {p.ledger_balance > 0 ? 'DR' : p.ledger_balance < 0 ? 'CR' : ''}
                    </span>
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  {p.ledger_id
                    ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">✓ Linked</span>
                    : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">✗ Unlinked</span>
                  }
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                    <button
                      className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-white hover:shadow-xl rounded-xl"
                      title="Edit Party"
                      onClick={() => handleEdit(p)}
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-xl rounded-xl"
                      title="Delete Party"
                      onClick={() => handleDelete(p)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </ModernTable>
        </SectionCard>
      </div>

      {showModal && (
        <PartyModal
          isOpen={showModal}
          initialData={editingParty}
          onClose={() => { setShowModal(false); setEditingParty(null); }}
          onSave={() => { setShowModal(false); setEditingParty(null); fetchParties(); }}
        />
      )}

      {showImportModal && (
        <PartyMigrationModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => { setShowImportModal(false); fetchParties(); }}
        />
      )}
    </PageContainer>
  );
}

export default PartiesPage;
