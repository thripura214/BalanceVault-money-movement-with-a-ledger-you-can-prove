import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminBootstrapPage } from './pages/AdminBootstrapPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { LedgerVerifyPage } from './pages/LedgerVerifyPage';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'bootstrap'>('login');
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'ledger' | 'admin'>('dashboard');
  const [inspectedTxId, setInspectedTxId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-emerald-400 font-mono text-sm">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>INITIALIZING BALANCEVAULT SYSTEM...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Authentication flows
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'bootstrap') {
      return <AdminBootstrapPage onBackToLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginPage
        onSwitchToRegister={() => setAuthView('register')}
        onSwitchToBootstrap={() => setAuthView('bootstrap')}
      />
    );
  }

  const handleOpenLedgerProof = (txId: string) => {
    setInspectedTxId(txId);
    setCurrentTab('ledger');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar currentTab={currentTab} setCurrentTab={(tab) => setCurrentTab(tab as any)} />

      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <DashboardPage onOpenLedgerProof={handleOpenLedgerProof} />
        )}
        {currentTab === 'ledger' && (
          <LedgerVerifyPage initialTxId={inspectedTxId} />
        )}
        {currentTab === 'admin' && (
          <AdminPage />
        )}
      </main>

      <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BalanceVault &copy; 2026. Built for Snovasys Fresher Hiring Challenge.</span>
          <span className="font-mono text-[11px] text-emerald-500/80">SHA-256 Chained Provable Ledger</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
