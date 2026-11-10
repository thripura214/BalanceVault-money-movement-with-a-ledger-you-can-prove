import { PrismaClient, UserRole, OnboardingStatus, AccountStatus, TransactionType, TransactionStatus, LedgerEntryType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { appendLedgerEntry, GENESIS_HASH } from '../src/lib/ledger';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding synthetic data for BalanceVault Hackathon Demo...');

  // Clean existing records if any
  await prisma.auditLog.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@Vault2026', salt);
  const userPassword = await bcrypt.hash('User@Vault2026', salt);

  // 1. Seed System Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@balancevault.com',
      fullName: 'Chief Compliance Administrator',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      onboardingStatus: OnboardingStatus.APPROVED
    }
  });

  // 2. Seed Auditor User
  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@balancevault.com',
      fullName: 'External Financial Auditor',
      passwordHash: userPassword,
      role: UserRole.AUDITOR,
      onboardingStatus: OnboardingStatus.APPROVED
    }
  });

  // 3. Seed Account Holders
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      fullName: 'Alice Walker',
      passwordHash: userPassword,
      role: UserRole.ACCOUNT_HOLDER,
      onboardingStatus: OnboardingStatus.APPROVED,
      phone: '+1-555-0101'
    }
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      fullName: 'Bob Martinez',
      passwordHash: userPassword,
      role: UserRole.ACCOUNT_HOLDER,
      onboardingStatus: OnboardingStatus.APPROVED,
      phone: '+1-555-0102'
    }
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      fullName: 'Charlie Davis',
      passwordHash: userPassword,
      role: UserRole.ACCOUNT_HOLDER,
      onboardingStatus: OnboardingStatus.PENDING,
      kycDocumentUrl: 'KYC-DOC-CH-9912.pdf'
    }
  });

  // 4. Create Financial Accounts
  const aliceAcc = await prisma.account.create({
    data: {
      accountNumber: 'BV-100201',
      userId: alice.id,
      balance: 5000.00,
      status: AccountStatus.ACTIVE
    }
  });

  const bobAcc = await prisma.account.create({
    data: {
      accountNumber: 'BV-100202',
      userId: bob.id,
      balance: 2500.00,
      status: AccountStatus.ACTIVE
    }
  });

  const charlieAcc = await prisma.account.create({
    data: {
      accountNumber: 'BV-100203',
      userId: charlie.id,
      balance: 0.00,
      status: AccountStatus.PENDING_APPROVAL
    }
  });

  // 5. Seed Initial Transactions & Provable Ledger Entries
  // Transaction 1: Alice Initial Deposit
  const tx1 = await prisma.transaction.create({
    data: {
      reference: 'INIT-DEP-001',
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      amount: 5000.00,
      recipientAccountId: aliceAcc.id,
      description: 'Initial funding deposit'
    }
  });

  await appendLedgerEntry(prisma, {
    transactionId: tx1.id,
    accountId: aliceAcc.id,
    entryType: LedgerEntryType.CREDIT,
    amount: 5000.00,
    balanceBefore: 0.00,
    balanceAfter: 5000.00
  });

  // Transaction 2: Bob Initial Deposit
  const tx2 = await prisma.transaction.create({
    data: {
      reference: 'INIT-DEP-002',
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      amount: 2500.00,
      recipientAccountId: bobAcc.id,
      description: 'Initial funding deposit'
    }
  });

  await appendLedgerEntry(prisma, {
    transactionId: tx2.id,
    accountId: bobAcc.id,
    entryType: LedgerEntryType.CREDIT,
    amount: 2500.00,
    balanceBefore: 0.00,
    balanceAfter: 2500.00
  });

  // 6. Record Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'SYSTEM_GENESIS_SEED',
        details: 'Initial database initialization and ledger genesis'
      },
      {
        userId: alice.id,
        action: 'USER_REGISTERED',
        details: JSON.stringify({ email: alice.email, account: aliceAcc.accountNumber })
      },
      {
        userId: bob.id,
        action: 'USER_REGISTERED',
        details: JSON.stringify({ email: bob.email, account: bobAcc.accountNumber })
      },
      {
        userId: charlie.id,
        action: 'KYC_SUBMITTED',
        details: 'KYC Document reference uploaded for compliance review'
      }
    ]
  });

  console.log('Seed completed successfully!');
  console.log('Demo Credentials:');
  console.log('- Admin:   admin@balancevault.com / Admin@Vault2026');
  console.log('- Auditor: auditor@balancevault.com / User@Vault2026');
  console.log('- User 1:  alice@example.com / User@Vault2026 (Account: BV-100201)');
  console.log('- User 2:  bob@example.com / User@Vault2026 (Account: BV-100202)');
  console.log('- User 3:  charlie@example.com / User@Vault2026 (Pending KYC)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
