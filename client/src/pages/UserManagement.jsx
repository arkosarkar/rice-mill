import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UsersIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import authFetch from '../utils/authFetch';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/ui/StatCard';
import { PageContainer, SectionCard, ModernTable } from '../components/ui/Layout';



const ROLE_STYLES = {
  admin:    'bg-indigo-50 text-indigo-700 border-indigo-100',
  operator: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ username: '', password: '', role: 'operator' });

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await authFetch('/users');
      if (res.ok) setUsers(await res.json());
      else { const e = await res.json(); setError(e.message || 'Failed to fetch users'); }
    } catch { setError('Connection error'); }
    finally { setLoading(false); }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!formData.username || !formData.password) { setError('Username and password are required.'); return; }
    setIsSubmitting(true);
    try {
      const res = await authFetch('/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) { setSuccess('User registered successfully!'); setFormData({ username: '', password: '', role: 'operator' }); fetchUsers(); }
      else setError(data.message || 'Failed to register user');
    } catch { setError('Connection error'); }
    finally { setIsSubmitting(false); }
  };

  const isAdmin = currentUser?.role === 'admin';
  const adminCount    = users.filter(u => u.role === 'admin').length;
  const operatorCount = users.filter(u => u.role === 'operator').length;

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 mt-1 italic font-medium">Manage ERP access, operator roles, and account credentials.</p>
        </div>
      </div>

      {!isAdmin ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-6 bg-white border border-rose-100 rounded-[2.5rem] font-sans">
          <div className="bg-rose-50 p-6 rounded-full">
            <ExclamationTriangleIcon className="h-16 w-16 text-rose-400" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-rose-600 italic uppercase tracking-tighter">Access Denied</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">Only administrators can access the user management dashboard.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard title="Total Users"  value={users.length}    unit="ACCOUNTS"  trend="REGISTERED" icon={UsersIcon}       colorClass="text-indigo-600"  iconBg="bg-indigo-50" />
            <StatCard title="Admins"       value={adminCount}      unit="FULL ACCESS" trend="ADMIN"   icon={ShieldCheckIcon} colorClass="text-violet-600"  iconBg="bg-violet-50" />
            <StatCard title="Operators"    value={operatorCount}   unit="STANDARD"  trend="LIMITED"  icon={UserCircleIcon}  colorClass="text-emerald-600" iconBg="bg-emerald-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Registration Form */}
            <div className="lg:col-span-1">
              <SectionCard title="Register New User">
                {error && (
                  <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 mb-6">
                    <ExclamationTriangleIcon className="h-5 w-5 text-rose-500 shrink-0" />
                    <p className="text-xs font-black text-rose-600">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 mb-6">
                    <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                    <p className="text-xs font-black text-emerald-700">{success}</p>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                    <input
                      id="username" type="text" value={formData.username}
                      onChange={handleInputChange}
                      placeholder="e.g. john.operator"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="password" type="password" value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Secure password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                    <select
                      id="role" value={formData.role}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none"
                    >
                      <option value="operator">Operator (Standard Access)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl uppercase text-[10px] tracking-[0.2em] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  >
                    {isSubmitting ? 'Registering...' : 'Create User Account'}
                  </button>
                </form>
              </SectionCard>
            </div>

            {/* User List */}
            <div className="lg:col-span-2">
              <SectionCard title="Registered Users">
                {loading ? (
                  <div className="py-24 flex flex-col items-center justify-center space-y-4">
                    <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Loading users...</p>
                  </div>
                ) : (
                  <ModernTable headers={['User', 'Role', 'Created']}>
                    {users.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-20 text-center font-black text-slate-300 uppercase italic text-[10px] tracking-[0.3em]">No users found</td></tr>
                    ) : users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 group transition-all duration-200">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-2xl bg-slate-900 flex items-center justify-center shadow-sm">
                              <span className="text-xs font-black text-white uppercase">{u.username.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-black text-slate-900">{u.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${ROLE_STYLES[u.role] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                            {u.role === 'admin' ? '⭐ ' : ''}{u.role}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-slate-400">
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </ModernTable>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
