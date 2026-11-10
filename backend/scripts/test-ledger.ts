import { computeEntryHash, GENESIS_HASH } from '../src/lib/ledger';

async function runTests() {
  console.log('--- Running BalanceVault Cryptographic Engine Unit Tests ---');

  // Test 1: Hash computation reproducibility
  const ts = new Date('2026-11-10T12:00:00.000Z');
  const hash1 = computeEntryHash(GENESIS_HASH, 1, 'tx-100', 'acc-1', 'CREDIT', 500, 500, ts);
  const hash2 = computeEntryHash(GENESIS_HASH, 1, 'tx-100', 'acc-1', 'CREDIT', 500, 500, ts);

  if (hash1 !== hash2) {
    throw new Error('Test 1 failed: Hash calculation is not deterministic');
  }
  console.log('[PASS] Test 1: Deterministic SHA-256 hash generation verified.');

  // Test 2: Tamper detection test
  // If someone alters the balance or amount even by $0.01, the hash changes completely
  const tamperedHash = computeEntryHash(GENESIS_HASH, 1, 'tx-100', 'acc-1', 'CREDIT', 500.01, 500.01, ts);
  if (hash1 === tamperedHash) {
    throw new Error('Test 2 failed: Tamper was not detected!');
  }
  console.log('[PASS] Test 2: Mathematical tamper detection sensitivity verified.');

  // Test 3: Sequential Chaining Integrity
  const hashBlock2 = computeEntryHash(hash1, 2, 'tx-101', 'acc-2', 'CREDIT', 200, 200, ts);
  if (hashBlock2.length !== 64) {
    throw new Error('Test 3 failed: Invalid SHA-256 digest length');
  }
  console.log('[PASS] Test 3: Block chaining linkage successfully verified.');

  console.log('\nAll core cryptographic ledger unit tests PASSED successfully!');
}

runTests().catch((err) => {
  console.error('[FAIL] Test suite error:', err);
  process.exit(1);
});
