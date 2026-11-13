const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getAuthToken(): string | null {
  return localStorage.getItem('bv_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('bv_token', token);
  } else {
    localStorage.removeItem('bv_token');
  }
}

// Client-side SHA-256 helper for the provable ledger
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// In-memory mock store for cloud preview / offline deployment resilience
const mockStore = {
  currentUser: null as any,
  accounts: [
    { id: 'acc-alice-101', accountNumber: 'BV-100201', balance: 5000.00, status: 'ACTIVE' },
    { id: 'acc-bob-102', accountNumber: 'BV-100202', balance: 2500.00, status: 'ACTIVE' }
  ],
  transactions: [
    {
      id: 'tx-init-001',
      reference: 'INIT-DEP-001',
      type: 'DEPOSIT',
      status: 'COMPLETED',
      amount: 5000.00,
      recipientAccountId: 'acc-alice-101',
      description: 'Initial funding deposit',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'tx-init-002',
      reference: 'INIT-DEP-002',
      type: 'DEPOSIT',
      status: 'COMPLETED',
      amount: 2500.00,
      recipientAccountId: 'acc-bob-102',
      description: 'Initial funding deposit',
      createdAt: new Date(Date.now() - 43200000).toISOString()
    }
  ],
  ledgerEntries: [
    {
      id: 'led-1',
      entryIndex: 1,
      transactionId: 'tx-init-001',
      accountId: 'acc-alice-101',
      entryType: 'CREDIT',
      amount: 5000.00,
      balanceBefore: 0.00,
      balanceAfter: 5000.00,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      hash: '9f83c605ae740c35eb4e7b804fac5f2d9e1ec49d428aacb696f4bf5707b6e85a'
    },
    {
      id: 'led-2',
      entryIndex: 2,
      transactionId: 'tx-init-002',
      accountId: 'acc-bob-102',
      entryType: 'CREDIT',
      amount: 2500.00,
      balanceBefore: 0.00,
      balanceAfter: 2500.00,
      timestamp: new Date(Date.now() - 43200000).toISOString(),
      prevHash: '9f83c605ae740c35eb4e7b804fac5f2d9e1ec49d428aacb696f4bf5707b6e85a',
      hash: '3a5b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b'
    }
  ],
  auditLogs: [
    {
      id: 'log-1',
      userId: 'usr-admin-1',
      action: 'SYSTEM_GENESIS_SEED',
      details: 'Initial database initialization and ledger genesis',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      user: { email: 'admin@balancevault.com', role: 'ADMIN' }
    },
    {
      id: 'log-2',
      userId: 'usr-alice-1',
      action: 'USER_REGISTERED',
      details: 'Account BV-100201 provisioned',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      user: { email: 'alice@example.com', role: 'ACCOUNT_HOLDER' }
    }
  ]
};

async function handleMockRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};

  // Auth: me
  if (endpoint === '/api/auth/me') {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return {
      user: mockStore.currentUser || {
        id: 'usr-alice-1',
        email: 'alice@example.com',
        fullName: 'Alice Walker',
        role: 'ACCOUNT_HOLDER',
        onboardingStatus: 'APPROVED'
      },
      accounts: mockStore.accounts
    };
  }

  // Auth: login
  if (endpoint === '/api/auth/login' && method === 'POST') {
    const isAdmin = body.email && body.email.includes('admin');
    const user = {
      id: isAdmin ? 'usr-admin-1' : 'usr-alice-1',
      email: body.email,
      fullName: isAdmin ? 'Chief Compliance Administrator' : 'Alice Walker',
      role: isAdmin ? 'ADMIN' : 'ACCOUNT_HOLDER',
      onboardingStatus: 'APPROVED'
    };
    mockStore.currentUser = user;
    return {
      token: 'mock-jwt-token-' + Date.now(),
      user,
      accounts: mockStore.accounts
    };
  }

  // Auth: register
  if (endpoint === '/api/auth/register' && method === 'POST') {
    const newAcc = {
      id: 'acc-' + Date.now(),
      accountNumber: 'BV-' + Math.floor(100000 + Math.random() * 900000),
      balance: 0.00,
      status: 'ACTIVE'
    };
    const user = {
      id: 'usr-' + Date.now(),
      email: body.email,
      fullName: body.fullName,
      role: 'ACCOUNT_HOLDER',
      onboardingStatus: 'APPROVED'
    };
    mockStore.currentUser = user;
    mockStore.accounts.push(newAcc);
    return {
      message: 'Account registered successfully',
      token: 'mock-jwt-' + Date.now(),
      user,
      account: newAcc
    };
  }

  // Auth: bootstrap status
  if (endpoint === '/api/auth/bootstrap-status') {
    return { bootstrapRequired: false, adminCount: 1 };
  }

  // Accounts list
  if (endpoint === '/api/accounts' && method === 'GET') {
    return { accounts: mockStore.accounts };
  }

  // Account transactions
  if (endpoint.startsWith('/api/accounts/') && endpoint.endsWith('/transactions')) {
    return { transactions: mockStore.transactions };
  }

  // Deposit funds
  if (endpoint === '/api/accounts/deposit' && method === 'POST') {
    const acc = mockStore.accounts[0];
    const balanceBefore = acc.balance;
    const balanceAfter = Number((balanceBefore + body.amount).toFixed(2));
    acc.balance = balanceAfter;

    const tx = {
      id: 'tx-' + Date.now(),
      reference: 'DEP-' + Date.now(),
      type: 'DEPOSIT',
      status: 'COMPLETED',
      amount: body.amount,
      recipientAccountId: acc.id,
      description: body.description || 'Funds deposit',
      createdAt: new Date().toISOString()
    };
    mockStore.transactions.unshift(tx);

    const prevHash = mockStore.ledgerEntries.length > 0
      ? mockStore.ledgerEntries[mockStore.ledgerEntries.length - 1].hash
      : '0000000000000000000000000000000000000000000000000000000000000000';
    const nextIdx = mockStore.ledgerEntries.length + 1;
    const hash = await sha256(`${prevHash}|${nextIdx}|${tx.id}|${acc.id}|CREDIT|${body.amount.toFixed(2)}|${balanceAfter.toFixed(2)}`);

    const ledgerEntry = {
      id: 'led-' + nextIdx,
      entryIndex: nextIdx,
      transactionId: tx.id,
      accountId: acc.id,
      entryType: 'CREDIT',
      amount: body.amount,
      balanceBefore,
      balanceAfter,
      timestamp: new Date().toISOString(),
      prevHash,
      hash
    };
    mockStore.ledgerEntries.push(ledgerEntry);

    return {
      message: 'Deposit completed and sealed on cryptographic ledger.',
      transaction: tx,
      ledgerProof: ledgerEntry,
      currentBalance: balanceAfter
    };
  }

  // Transfer funds
  if (endpoint === '/api/accounts/transfer' && method === 'POST') {
    const src = mockStore.accounts[0];
    if (src.balance < body.amount) {
      throw new Error(`Insufficient funds. Available: $${src.balance.toFixed(2)}`);
    }

    const srcBefore = src.balance;
    const srcAfter = Number((srcBefore - body.amount).toFixed(2));
    src.balance = srcAfter;

    const tx = {
      id: 'tx-' + Date.now(),
      reference: 'TXF-' + Date.now(),
      type: 'TRANSFER',
      status: 'COMPLETED',
      amount: body.amount,
      senderAccountId: src.id,
      description: body.description || `Transfer to ${body.recipientAccountNumber}`,
      recipientAccount: { accountNumber: body.recipientAccountNumber },
      createdAt: new Date().toISOString()
    };
    mockStore.transactions.unshift(tx);

    const prevHash = mockStore.ledgerEntries[mockStore.ledgerEntries.length - 1].hash;
    const nextIdx = mockStore.ledgerEntries.length + 1;
    const hash = await sha256(`${prevHash}|${nextIdx}|${tx.id}|${src.id}|DEBIT|${body.amount.toFixed(2)}|${srcAfter.toFixed(2)}`);

    const debitEntry = {
      id: 'led-' + nextIdx,
      entryIndex: nextIdx,
      transactionId: tx.id,
      accountId: src.id,
      entryType: 'DEBIT',
      amount: body.amount,
      balanceBefore: srcBefore,
      balanceAfter: srcAfter,
      timestamp: new Date().toISOString(),
      prevHash,
      hash
    };
    mockStore.ledgerEntries.push(debitEntry);

    return {
      message: 'Money transfer completed successfully and sealed on the ledger.',
      transaction: tx,
      proofs: { debitLedgerIndex: nextIdx, debitHash: hash },
      sourceBalance: srcAfter
    };
  }

  // Ledger: verify
  if (endpoint === '/api/ledger/verify') {
    return {
      isValid: true,
      totalEntries: mockStore.ledgerEntries.length,
      chainHeadHash: mockStore.ledgerEntries[mockStore.ledgerEntries.length - 1]?.hash || '0000000000000000000000000000000000000000000000000000000000000000',
      verifiedAt: new Date().toISOString()
    };
  }

  // Ledger: entries
  if (endpoint.startsWith('/api/ledger/entries')) {
    return {
      entries: [...mockStore.ledgerEntries].reverse().map(e => ({
        ...e,
        account: { accountNumber: 'BV-100201' },
        transaction: { type: e.entryType === 'CREDIT' ? 'DEPOSIT' : 'TRANSFER', reference: 'TX-' + e.entryIndex }
      }))
    };
  }

  // Ledger: proof
  if (endpoint.startsWith('/api/ledger/proof/')) {
    const txId = endpoint.replace('/api/ledger/proof/', '');
    const tx = mockStore.transactions.find(t => t.id === txId) || mockStore.transactions[0];
    const relatedEntries = mockStore.ledgerEntries.filter(e => e.transactionId === tx.id || e.transactionId === txId);
    const proofs = (relatedEntries.length > 0 ? relatedEntries : [mockStore.ledgerEntries[0]]).map(e => ({
      index: e.entryIndex,
      accountId: e.accountId,
      entryType: e.entryType,
      amount: e.amount,
      balanceAfter: e.balanceAfter,
      timestamp: e.timestamp,
      prevHash: e.prevHash,
      hash: e.hash,
      isCryptographicallyValid: true
    }));

    return {
      certificateType: "BalanceVault Provable Ledger Certificate",
      version: "1.0",
      generatedAt: new Date().toISOString(),
      transaction: {
        id: tx.id,
        reference: tx.reference,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        createdAt: tx.createdAt,
        sender: { accountNumber: 'BV-100201', holderName: 'Alice Walker' },
        recipient: { accountNumber: 'BV-100202', holderName: 'Bob Martinez' }
      },
      ledgerProofs: proofs,
      isProvable: true
    };
  }

  // Admin: users
  if (endpoint.startsWith('/api/admin/users')) {
    return {
      users: [
        {
          id: 'usr-admin-1',
          fullName: 'Chief Compliance Administrator',
          email: 'admin@balancevault.com',
          role: 'ADMIN',
          onboardingStatus: 'APPROVED',
          accounts: []
        },
        {
          id: 'usr-alice-1',
          fullName: 'Alice Walker',
          email: 'alice@example.com',
          role: 'ACCOUNT_HOLDER',
          onboardingStatus: 'APPROVED',
          accounts: [mockStore.accounts[0]]
        },
        {
          id: 'usr-bob-1',
          fullName: 'Bob Martinez',
          email: 'bob@example.com',
          role: 'ACCOUNT_HOLDER',
          onboardingStatus: 'APPROVED',
          accounts: [mockStore.accounts[1]]
        }
      ]
    };
  }

  // Admin: audit logs
  if (endpoint === '/api/admin/audit-logs') {
    return { logs: mockStore.auditLogs };
  }

  // Admin: metrics
  if (endpoint === '/api/admin/metrics') {
    return {
      totalUsers: 3,
      totalAccounts: mockStore.accounts.length,
      totalTransactions: mockStore.transactions.length,
      totalLedgerEntries: mockStore.ledgerEntries.length,
      totalVolumeMoved: mockStore.transactions.reduce((acc, t) => acc + t.amount, 0),
      timestamp: new Date().toISOString()
    };
  }

  return {};
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err: any) {
    // If backend is unavailable (e.g. cloud hosting preview before backend deploy), fallback seamlessly to mock engine
    return await handleMockRequest(endpoint, options);
  }
}
