import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import {
  Users,
  ShieldAlert,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Search
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'metrics'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const data = await apiRequest(`/api/admin/users?search=${encodeURIComponent(search)}`);
        setUsers(data.users || []);
      } else if (activeTab === 'audit') {
        const data = await apiRequest('/api/admin/audit-logs');
        setAuditLogs(data.logs || []);
      } else if (activeTab === 'metrics') {
        const data = await apiRequest('/api/admin/metrics');
        setMetrics(data);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/onboarding`, {
        method: 'PATCH',
        body: JSON.stringify({ onboardingStatus: status })
      });
      setActionMessage(`Updated user status to ${status}`);
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      setActionMessage(`Updated user role to ${role}`);
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              SECURITY LEVEL 1
            </span>
            <span className="text-xs font-mono text-slate-400">ADMIN CONTROL CENTER</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Compliance & User Operations</h1>
        </div>

        {/* Tab selection */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Onboarding</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'audit'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'metrics'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>System Metrics</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">Dismiss</button>
        </div>
      )}

      {/* TAB 1: USERS & ONBOARDING */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Directory</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Account / Balance</th>
                  <th className="pb-3 font-semibold">KYC / Onboarding</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => {
                  const primaryAcc = u.accounts && u.accounts[0];
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/20">
                      <td className="py-4">
                        <div className="font-semibold text-white text-sm">{u.fullName}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded font-mono font-semibold text-[10px] border ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                            : u.role === 'AUDITOR'
                            ? 'bg-purple-950/60 text-purple-400 border-purple-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 font-mono">
                        {primaryAcc ? (
                          <div>
                            <span className="text-emerald-400 font-semibold">${primaryAcc.balance.toFixed(2)}</span>
                            <span className="text-slate-500 text-[11px] block">{primaryAcc.accountNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col">
                          <span className={`font-semibold ${
                            u.onboardingStatus === 'APPROVED' ? 'text-emerald-400' :
                            u.onboardingStatus === 'PENDING' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {u.onboardingStatus}
                          </span>
                          {u.kycDocumentUrl && (
                            <span className="text-[10px] font-mono text-slate-400 truncate max-w-xs">
                              Doc: {u.kycDocumentUrl}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right space-x-1.5 whitespace-nowrap">
                        {u.onboardingStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(u.id, 'APPROVED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {u.onboardingStatus !== 'SUSPENDED' && (
                          <button
                            onClick={() => handleUpdateStatus(u.id, 'SUSPENDED')}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                        {u.role !== 'AUDITOR' && (
                          <button
                            onClick={() => handleUpdateRole(u.id, 'AUDITOR')}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-colors"
                          >
                            Make Auditor
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG VIEWER */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Immutable Security Audit Logs</h3>
              <p className="text-xs text-slate-400">All administrative, onboarding, and high-value financial actions.</p>
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Actor</th>
                  <th className="pb-3">IP Address</th>
                  <th className="pb-3">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20">
                    <td className="py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toISOString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      {log.user ? `${log.user.email} (${log.user.role})` : 'SYSTEM'}
                    </td>
                    <td className="py-3 text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="py-3 text-slate-300 max-w-xs truncate" title={log.details}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM METRICS */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Users</span>
            <div className="text-3xl font-extrabold text-white mt-2">{metrics?.totalUsers ?? '...'}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">Active across all roles</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <span className="text-xs text-slate-400 uppercase font-semibold">Managed Accounts</span>
            <div className="text-3xl font-extrabold text-white mt-2">{metrics?.totalAccounts ?? '...'}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">With isolated balances</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <span className="text-xs text-slate-400 uppercase font-semibold">Ledger Blocks</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">{metrics?.totalLedgerEntries ?? '...'}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">SHA-256 chained entries</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <span className="text-xs text-slate-400 uppercase font-semibold">Volume Moved</span>
            <div className="text-3xl font-extrabold text-white mt-2">
              ${(metrics?.totalVolumeMoved || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Total transacted volume</span>
          </div>
        </div>
      )}
    </div>
  );
};

