import React, { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  ShieldCheckIcon, 
  KeyIcon, 
  BuildingOfficeIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import authFetch from '../utils/authFetch';
import { PageContainer, SectionCard, ModernTable } from '../components/ui/Layout';
import StatCard from '../components/ui/StatCard';

const ACCESS_LEVELS = ['No Role', 'Viewer', 'Creator', 'Editor'];
const MODULES = ['Customers', 'Paddy', 'Production', 'Cleaning', 'Sales', 'Accounts', 'Reports', 'UserManagement'];

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null); // 'new' or 'roles'
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalTab, setModalTab] = useState('credentials');
  
  // New User Form State
  const [formData, setFormData] = useState({
    username: '', password: '', email: '', full_name: '', role: 'Operator', site_id: ''
  });
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await authFetch('/users');
      if (res.ok) setUsers(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const handleCreateUser = async () => {
    setError('');
    try {
      const res = await authFetch('/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(null);
        fetchUsers();
        setFormData({ username: '', password: '', email: '', full_name: '', role: 'Operator', site_id: '' });
      } else {
        setError(data.message || 'Failed to create user');
      }
    } catch (err) { setError('Connection error'); }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await authFetch(`/users/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchUsers();
    } catch (err) { console.error(err); }
  };

  const handleUpdatePermissions = async (updatedPerms) => {
    try {
      const res = await authFetch(`/users/${selectedUser.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: updatedPerms })
      });
      if (res.ok) {
        setShowModal(null);
        fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 font-medium">Control access levels and site assignments for your team.</p>
        </div>
        <button 
          onClick={() => setShowModal('new')}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlusIcon className="h-5 w-5" /> Add New User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Users" value={users.length} unit="TEAM MEMBERS" icon={UserPlusIcon} colorClass="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard title="Active Now" value={users.filter(u => u.status === 'active').length} unit="REGISTERED" icon={CheckCircleIcon} colorClass="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Security Status" value="Healthy" unit="ENCRYPTED" icon={ShieldCheckIcon} colorClass="text-violet-600" iconBg="bg-violet-50" />
      </div>

      <SectionCard title="Registered Users">
        <ModernTable headers={['Name', 'Email', 'Type', 'Site ID', 'Status', 'Actions']}>
          {users.map(user => (
            <tr key={user.id} className="hover:bg-slate-50/50">
              <td className="px-6 py-4">
                <div className="font-bold text-slate-900">{user.full_name || user.username}</div>
                <div className="text-xs text-slate-400">ID: {user.id}</div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{user.email || '—'}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-bold text-slate-500">{user.site_id || 'Global'}</td>
              <td className="px-6 py-4">
                <button onClick={() => toggleStatus(user)} className="focus:outline-none">
                  {user.status === 'active' ? (
                    <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <XCircleIcon className="h-6 w-6 text-slate-300" />
                  )}
                </button>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setSelectedUser(user); setShowModal('roles'); }}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="Edit Roles"
                  >
                    <ShieldCheckIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </ModernTable>
      </SectionCard>

      {/* New User Modal */}
      {showModal === 'new' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-6 border-bottom flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Add New User</h3>
              <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="flex bg-slate-50 border-b">
              <button 
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'credentials' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-400'}`}
                onClick={() => setModalTab('credentials')}
              >
                1. Credentials
              </button>
              <button 
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'sites' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-400'}`}
                onClick={() => setModalTab('sites')}
              >
                2. Sites & Location
              </button>
            </div>

            <div className="p-8 space-y-6">
              {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold border border-rose-100">{error}</div>}
              
              {modalTab === 'credentials' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Full Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-100" 
                      placeholder="John Doe"
                      value={formData.full_name}
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Username</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm" 
                      placeholder="jdoe123"
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Password</label>
                    <input 
                      type="password" 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm" 
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm" 
                      placeholder="john@ricemillpro.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">User Type</label>
                    <select 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="Operator">Operator</option>
                      <option value="Admin">Admin</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                   <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-start gap-4">
                      <BuildingOfficeIcon className="h-8 w-8 text-indigo-500 shrink-0" />
                      <div>
                        <h4 className="font-bold text-indigo-900">Site Assignment</h4>
                        <p className="text-sm text-indigo-600 mt-1">Select the godown or processing unit this user will manage.</p>
                      </div>
                   </div>
                   <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Select Godown / Site</label>
                    <select 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm"
                      value={formData.site_id}
                      onChange={e => setFormData({...formData, site_id: e.target.value})}
                    >
                      <option value="">Global (All Sites)</option>
                      <option value="1">Godown A - Processing</option>
                      <option value="2">Godown B - Storage</option>
                      <option value="3">Main Office</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowModal(null)} className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={handleCreateUser} className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all">Create User</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {showModal === 'roles' && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="bg-indigo-600 p-8 text-white">
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="text-2xl font-black">Edit Roles & Permissions</h3>
                      <p className="text-indigo-100 font-medium mt-1">User: {selectedUser.full_name || selectedUser.username}</p>
                   </div>
                   <button onClick={() => setShowModal(null)} className="text-white/60 hover:text-white text-2xl">✕</button>
                </div>
             </div>

             <div className="p-8">
                <div className="space-y-1">
                   {MODULES.map(mod => (
                     <div key={mod} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0 group">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                              <KeyIcon className="h-5 w-5 text-slate-400 group-hover:text-indigo-500" />
                           </div>
                           <span className="font-bold text-slate-700">{mod}</span>
                        </div>
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                           {ACCESS_LEVELS.map(level => (
                             <button 
                                key={level}
                                onClick={() => {
                                  const newPerms = { ...selectedUser.permissions, [mod]: level };
                                  setSelectedUser({ ...selectedUser, permissions: newPerms });
                                }}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                                  (selectedUser.permissions?.[mod] || 'No Role') === level 
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                             >
                                {level}
                             </button>
                           ))}
                        </div>
                     </div>
                   ))}
                </div>

                <div className="flex gap-4 mt-10">
                   <button onClick={() => setShowModal(null)} className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest">Discard Changes</button>
                   <button 
                    onClick={() => handleUpdatePermissions(selectedUser.permissions)}
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all"
                   >
                     Apply Permissions
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default UserManagementPage;
