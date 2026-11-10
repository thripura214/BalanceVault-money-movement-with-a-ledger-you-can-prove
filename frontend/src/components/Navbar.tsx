import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User as UserIcon, Activity, Key, Database } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                BalanceVault
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                PROVABLE LEDGER
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Account
            </button>

            <button
              onClick={() => setCurrentTab('ledger')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-all ${
                currentTab === 'ledger'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Ledger Proof</span>
            </button>

            {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
              <button
                onClick={() => setCurrentTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-all ${
                  currentTab === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Admin Portal</span>
              </button>
            )}

            {/* User status & Logout */}
            <div className="flex items-center pl-3 border-l border-slate-800 space-x-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-medium text-slate-200">{user?.fullName}</span>
                <span className="text-xs font-mono text-emerald-400">{user?.role}</span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

