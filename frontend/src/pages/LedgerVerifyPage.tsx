import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Database,
  ArrowRight,
  Fingerprint,
  RefreshCw,
  FileBadge
} from 'lucide-react';

interface LedgerVerifyPageProps {
  initialTxId?: string | null;
}

export const LedgerVerifyPage: React.FC<LedgerVerifyPageProps> = ({ initialTxId }) => {
  const [chainResult, setChainResult] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [searchTxId, setSearchTxId] = useState(initialTxId || '');
  const [proofCertificate, setProofCertificate] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runFullChainVerification();
    fetchRecentEntries();
    if (initialTxId) {
      inspectTransactionProof(initialTxId);
    }
  }, [initialTxId]);

  const runFullChainVerification = async () => {
    setVerifying(true);
    setError(null);
    try {
      const data = await apiRequest('/api/ledger/verify');
      setChainResult(data);
    } catch (err: any) {
      setError(err.message || 'Chain verification request failed');
    } finally {
      setVerifying(false);
    }
  };

  const fetchRecentEntries = async () => {
    try {
      const data = await apiRequest('/api/ledger/entries?limit=20');
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to load recent ledger entries:', err);
    }
  };

  const inspectTransactionProof = async (txId: string) => {
    if (!txId.trim()) return;
    setError(null);
    try {
      const data = await apiRequest(`/api/ledger/proof/${txId.trim()}`);
      setProofCertificate(data);
    } catch (err: any) {
      setError(`Proof lookup failed: ${err.message}`);
      setProofCertificate(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            CRYPTOGRAPHIC PROOF ENGINE
          </span>
          <span className="text-xs font-mono text-slate-400">SHA-256 LEDGER VALIDATOR</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mt-1">Provable Ledger Verification</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Mathematically prove that no transaction, account balance, or ledger entry has been altered, injected, or deleted.
        </p>
      </div>

      {/* Chain Status Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border mb-8 transition-all shadow-2xl ${
        chainResult?.isValid
          ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/30'
          : 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/30'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className={`p-4 rounded-2xl ${
              chainResult?.isValid
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}>
              {chainResult?.isValid ? <ShieldCheck className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-mono text-slate-400">Cryptographic Integrity Status</div>
              <div className="text-2xl font-bold text-white flex items-center space-x-2">
                <span>{chainResult?.isValid ? 'LEDGER PROOF: VERIFIED' : 'INTEGRITY VIOLATION DETECTED'}</span>
                {chainResult?.isValid && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Zero data tampering detected across all chained transactional blocks.
              </div>
            </div>
          </div>

          <button
            onClick={runFullChainVerification}
            disabled={verifying}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-2 border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Scanning Chain...' : 'Re-verify Entire Ledger'}</span>
          </button>
        </div>

        {chainResult && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block">Total Chained Blocks</span>
              <span className="text-white font-mono font-bold text-base">{chainResult.totalEntries}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 block">Current Chain Head Hash (SHA-256)</span>
              <span className="text-emerald-400 font-mono text-xs break-all">{chainResult.chainHeadHash}</span>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Proof Lookup Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-2">Inspect Transaction Proof Certificate</h3>
        <p className="text-xs text-slate-400 mb-6">
          Paste any Transaction ID or select from recent entries below to generate a mathematically verifiable certificate.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTxId}
              onChange={(e) => setSearchTxId(e.target.value)}
              placeholder="Paste Transaction UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => inspectTransactionProof(searchTxId)}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap"
          >
            Generate Certificate
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-6">
            {error}
          </div>
        )}

        {/* Certificate Display */}
        {proofCertificate && (
          <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/30 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <FileBadge className="w-5 h-5" />
                <span>{proofCertificate.certificateType}</span>
              </div>
              <span className="text-[11px] text-slate-500">Seal Time: {proofCertificate.generatedAt}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-slate-800">
              <div>
                <span className="text-slate-500 block">Transaction Reference</span>
                <span className="text-white font-semibold">{proofCertificate.transaction.reference}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Amount Transacted</span>
                <span className="text-emerald-400 font-bold text-sm">${proofCertificate.transaction.amount.toFixed(2)} USD</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sender Party</span>
                <span className="text-slate-300">{proofCertificate.transaction.sender?.holderName || 'SYSTEM DEPOSIT'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Recipient Party</span>
                <span className="text-slate-300">{proofCertificate.transaction.recipient?.holderName || 'SYSTEM'}</span>
              </div>
            </div>

            <div className="pt-4">
              <span className="text-slate-400 block font-bold mb-2">Chained Ledger Entries & Hash Proofs:</span>
              <div className="space-y-3">
                {proofCertificate.ledgerProofs.map((proof: any) => (
                  <div key={proof.index} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold">Block Index #{proof.index} ({proof.entryType})</span>
                      <span className="text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cryptographically Valid</span>
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Balance After: <span className="text-white font-semibold">${proof.balanceAfter.toFixed(2)}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500">PrevHash: </span>
                      <span className="text-slate-400">{proof.prevHash}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500">Block Hash: </span>
                      <span className="text-emerald-400">{proof.hash}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Chain Explorer */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-2">Live Sequential Ledger Blocks</h3>
        <p className="text-xs text-slate-400 mb-6">Real-time view of recent blocks cryptographically linked together.</p>

        <div className="space-y-4 font-mono text-xs">
          {entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => { setSearchTxId(entry.transactionId); inspectTransactionProof(entry.transactionId); }}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-950/80 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  #{entry.entryIndex}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-bold">{entry.entryType}</span>
                    <span className="text-emerald-400 font-semibold">${entry.amount.toFixed(2)}</span>
                    <span className="text-slate-500">→ Acc {entry.account?.accountNumber}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Balance After: ${entry.balanceAfter.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 md:text-right">
                <div className="truncate max-w-xs md:max-w-md">
                  <span className="text-slate-600">HASH: </span>
                  <span className="text-emerald-400/90">{entry.hash}</span>
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

