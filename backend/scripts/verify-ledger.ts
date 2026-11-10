import { PrismaClient } from '@prisma/client';
import { verifyLedgerChain } from '../src/lib/ledger';

const prisma = new PrismaClient();

async function main() {
  console.log('--- BalanceVault Cryptographic Ledger Verification ---');
  console.log('Initiating SHA-256 chain scan across all recorded transactions...\n');

  const start = Date.now();
  const result = await verifyLedgerChain(prisma);
  const duration = Date.now() - start;

  if (result.isValid) {
    console.log('[PASS] Ledger verification succeeded:');
    console.log(`- Total Chained Blocks: ${result.totalEntries}`);
    console.log(`- Chain Head Hash:      ${result.chainHeadHash}`);
    console.log(`- Verification Time:    ${duration}ms`);
    console.log(`- Mathematical Proof:   VERIFIED (Zero tampering detected)`);
  } else {
    console.error('[FAIL] Cryptographic integrity violation detected!');
    console.error(`- Tampered Block Index: ${result.tamperedIndex}`);
    console.error(`- Error:                ${result.error}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Ledger verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
