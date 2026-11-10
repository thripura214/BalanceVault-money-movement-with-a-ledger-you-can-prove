import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { KeyRound, ShieldAlert, CheckCircle, ArrowRight, AlertCircle, ArrowLeft, Lock } from 'lucide-react';

interface AdminBootstrapPageProps {
  onBackToLogin: () => void;
}

export const AdminBootstrapPage: React.FC<AdminBootstrapPageProps> = ({ onBackToLogin }) => {
  const { bootstrapAdmin } = useAuth();
  const [bootstrapStatus, setBootstrapStatus] = useState<{ bootstrapRequired: boolean; adminCount: number } | null>(null);
  const [fullName, setFullName] = useState('Lead Security Administrator');
  const [email, setEmail] = useState('admin@balancevault.internal');
  const [password, setPassword] = useState('VaultAdmin@2026');
  const [bootstrapKey, setBootstrapKey] = useState('balancevault-secure-bootstrap-key-2026');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const data = await apiRequest('/api/auth/bootstrap-status');
      setBootstrapStatus(data);
    } catch (err: any) {
      console.error('Failed to query bootstrap status:', err);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await bootstrapAdmin({
        fullName,
        email,
        password,
        bootstrapKey
      });
      setSuccess('Administrator successfully bootstrapped and logged in!');
    } catch (err: any) {
      setError(err.message || 'Bootstrap procedure failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-lg w-full">
        <button
          onClick={onBackToLogin}
          className="mb-4 inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </button>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">First Administrator Bootstrap</h2>
              <p className="text-xs text-slate-400">Emergency Genesis Setup & Role Privilege Elevation</p>
            </div>
          </div>

          {/* Status Banner */}
          <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">System State:</span>
              {bootstrapStatus?.bootstrapRequired ? (
                <span className="font-mono text-amber-400 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                  BOOTSTRAP REQUIRED (0 Admins)
                </span>
              ) : (
                <span className="font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  ADMIN ACTIVE ({bootstrapStatus?.adminCount || 1} Registered)
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleBootstrap} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Bootstrap Authorization Key
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-amber-500/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={bootstrapKey}
                  onChange={(e) => setBootstrapKey(e.target.value)}
                  placeholder="Enter BOOTSTRAP_SECRET"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm font-mono text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Default key from .env: balancevault-secure-bootstrap-key-2026</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Password (min. 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <span>{loading ? 'Executing Bootstrap...' : 'Bootstrap & Launch Admin'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
