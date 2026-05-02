/**
 * LoginPage.jsx
 * Premium ERP login screen — matches the app's existing design language.
 * No external UI library required.
 */
import React, { useState } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { username, password });
      login(res.data.token);
      // App.jsx watches isAuthenticated and will switch to the ERP view automatically
    } catch (err) {
      const msg = err?.response?.data?.message;
      setError(msg || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 p-4 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

      <div className="w-full max-w-4xl flex bg-white rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Left branding panel */}
        <div className="hidden lg:flex flex-1 bg-indigo-600 p-12 flex-col text-white relative">
          <div className="bg-white/10 p-4 rounded-2xl w-fit mb-8 backdrop-blur-sm">
             <div className="bg-white p-1 rounded-lg">
                <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
                </svg>
             </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">RiceMill<span className="text-indigo-200">Pro</span></h1>
          <p className="text-indigo-100/80 text-lg mb-12">Enterprise Resource Planning for Modern Mills.</p>

          <div className="space-y-6 flex-1">
            {[
              { icon: '📦', text: 'Real-time Godown Stock' },
              { icon: '💰', text: 'GST-compliant Invoicing' },
              { icon: '📊', text: 'P&L and Ledger Reports' },
              { icon: '⚙️', text: 'Production tracking' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">{f.icon}</span>
                <span className="font-medium text-indigo-50">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-xs text-indigo-200/60">
            v3.0 — Professional ERP Suite
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
              <p className="text-gray-500">Sign in to manage your mill operations.</p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                <span className="text-lg">⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="login-username">Username</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">👤</span>
                  <input
                    id="login-username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="login-password">Password</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">🔒</span>
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-12 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-lg opacity-50 hover:opacity-100 transition-opacity"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:bg-gray-400 disabled:shadow-none mt-4"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-gray-400">
              Only authorized staff can access the ERP system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


