import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Send,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface DashboardPageProps {
  onOpenLedgerProof: (txId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenLedgerProof }) => {
  const { user, accounts, refreshProfile } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<any>(accounts[0] || null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);

  // Form fields
  const [depositAmount, setDepositAmount] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [kycDoc, setKycDoc] = useState('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts]);

  useEffect(() => {
    if (selectedAccount?.id) {
      fetchTransactions(selectedAccount.id);
    }
  }, [selectedAccount]);

  const fetchTransactions = async (accId: string) => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/accounts/${accId}/transactions`);
      setTransactions(data.transactions || []);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await apiRequest('/api/accounts/deposit', {
        method: 'POST',
        body: JSON.stringify({
          accountId: selectedAccount.id,
          amount: parseFloat(depositAmount),
          description: 'Funds Added via Dashboard'
        })
      });

      setActionSuccess(`Deposit of $${depositAmount} completed! Sealed at Ledger Index #${res.ledgerProof.entryIndex}`);
      setDepositAmount('');
      setShowDepositModal(false);
      await refreshProfile();
      fetchTransactions(selectedAccount.id);
    } catch (err: any) {
      setActionError(err.message || 'Deposit failed');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await apiRequest('/api/accounts/transfer', {
        method: 'POST',
        body: JSON.stringify({
          sourceAccountId: selectedAccount.id,
          recipientAccountNumber: transferRecipient.trim(),
          amount: parseFloat(transferAmount),
          description: transferDesc
        })
      });

      setActionSuccess(`Transfer of $${transferAmount} successful! Cryptographic seal generated.`);
      setTransferRecipient('');
      setTransferAmount('');
      setTransferDesc('');
      setShowTransferModal(false);
      await refreshProfile();
      fetchTransactions(selectedAccount.id);
    } catch (err: any) {
      setActionError(err.message || 'Transfer failed');
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    try {
      await apiRequest('/api/accounts/kyc', {
        method: 'POST',
        body: JSON.stringify({ documentUrl: kycDoc })
      });
      setActionSuccess('KYC submission received! Administrator review pending.');
      setShowKycModal(false);
      setKycDoc('');
      await refreshProfile();
    } catch (err: any) {
      setActionError(err.message || 'KYC submission failed');
    }
  };

  const currentAcc = accounts.find(a => a.id === selectedAccount?.id) || selectedAccount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Onboarding Notice Banner */}
      {user?.onboardingStatus === 'PENDING' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <div className="font-semibold">KYC Verification In Progress</div>
              <div className="text-xs text-amber-300/80">
                Your account is currently in limited onboarding mode until compliance verifies your details.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowKycModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Submit KYC Documents
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200 text-xs font-bold">Dismiss</button>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200 text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Main Grid: Balance Card + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Balance Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck className="w-64 h-64 text-emerald-400" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Primary Balance</div>
              <div className="text-4xl sm:text-5xl font-extrabold text-white mt-1 tracking-tight">
                ${currentAcc?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                <span className="text-lg font-normal text-slate-400 ml-2">USD</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono px-3 py-1 rounded-full border ${
                currentAcc?.status === 'ACTIVE'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                  : 'bg-amber-950/60 text-amber-400 border-amber-800'
              }`}>
                STATUS: {currentAcc?.status || 'ACTIVE'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block">Account Number</span>
              <span className="font-mono text-emerald-400 font-semibold text-sm">
                {currentAcc?.accountNumber || 'BV-XXXXXX'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Account Holder</span>
              <span className="text-slate-200 font-medium text-sm">{user?.fullName}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-500 block">Ledger Verification</span>
              <span className="text-emerald-400 font-medium flex items-center space-x-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SHA-256 Chained</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Money Operations</h3>
            <p className="text-xs text-slate-400 mb-6">Execute verifiable balance operations with cryptographic proof receipts.</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { setShowTransferModal(true); setActionError(null); }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10"
            >
              <Send className="w-4 h-4" />
              <span>Transfer Money</span>
            </button>

            <button
              onClick={() => { setShowDepositModal(true); setActionError(null); }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center space-x-2 border border-slate-700"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Deposit Funds</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 text-center mt-4">
            Every transaction is mathematically sealed into the verifiable audit chain.
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Transaction History</h3>
            <p className="text-xs text-slate-400">All debits and credits recorded on the immutable ledger.</p>
          </div>
          <button
            onClick={() => selectedAccount && fetchTransactions(selectedAccount.id)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No transactions found on this account yet. Perform a deposit or transfer to see your ledger entries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Counterparty</th>
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold text-right">Provable Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {transactions.map((tx) => {
                  const isCredit = tx.recipientAccountId === currentAcc?.id;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-lg ${
                            isCredit
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <span className="font-semibold text-white capitalize">{tx.type.toLowerCase()}</span>
                        </div>
                      </td>
                      <td className="py-4 font-mono text-xs text-slate-400">{tx.reference}</td>
                      <td className="py-4 font-semibold text-white">
                        <span className={isCredit ? 'text-emerald-400' : 'text-slate-200'}>
                          {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 text-xs font-mono text-slate-400">
                        {isCredit
                          ? (tx.senderAccount ? tx.senderAccount.accountNumber : 'DIRECT DEPOSIT')
                          : (tx.recipientAccount ? tx.recipientAccount.accountNumber : 'SYSTEM')}
                      </td>
                      <td className="py-4 text-xs text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => onOpenLedgerProof(tx.id)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-400 text-xs font-medium text-slate-300 border border-slate-700 hover:border-emerald-500/30 transition-all"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>View Proof</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Deposit Funds</h3>
            <p className="text-xs text-slate-400 mb-6">Simulate inbound liquidity deposit to your account.</p>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="1000.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Transfer Money</h3>
            <p className="text-xs text-slate-400 mb-6">Atomic double-entry money movement with SHA-256 seal.</p>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase mb-1">Recipient Account Number</label>
                <input
                  type="text"
                  required
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  placeholder="e.g. BV-100202"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Tip: In demo seed, try Bob's account (BV-100202)</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentAcc?.balance || 999999}
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="50.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase mb-1">Note / Description</label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Invoice settlement / Peer transfer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KYC Modal */}
      {showKycModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Submit Onboarding KYC</h3>
            <p className="text-xs text-slate-400 mb-6">Provide government identification reference for compliance verification.</p>

            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase mb-1">Passport / National ID / Document Ref</label>
                <input
                  type="text"
                  required
                  value={kycDoc}
                  onChange={(e) => setKycDoc(e.target.value)}
                  placeholder="PASSPORT-USA-992014 or ID-CARD-991"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowKycModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
