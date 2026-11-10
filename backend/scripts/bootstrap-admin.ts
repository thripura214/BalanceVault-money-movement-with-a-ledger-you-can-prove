import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, OnboardingStatus } from '@prisma/client';
import { config } from '../src/config';

const prisma = new PrismaClient();

async function main() {
  console.log('--- BalanceVault First Administrator Bootstrap ---');

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@balancevault.internal';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'VaultAdmin@2026';
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME || 'Lead Security Administrator';

  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN }
  });

  if (existingAdmin) {
    console.log(`[!] An administrator already exists: ${existingAdmin.email} (${existingAdmin.id})`);
    console.log('Bootstrap aborted: Multiple first-admin bootstraps are not permitted.');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const admin = await prisma.user.create({
    data: {
      fullName: adminName,
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      onboardingStatus: OnboardingStatus.APPROVED
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'ADMIN_BOOTSTRAP_CLI',
      targetId: admin.id,
      details: JSON.stringify({
        method: 'CLI_BOOTSTRAP_SCRIPT',
        email: admin.email,
        timestamp: new Date().toISOString()
      })
    }
  });

  console.log('\n[SUCCESS] First administrator account successfully bootstrapped:');
  console.log(`- User ID:    ${admin.id}`);
  console.log(`- Email:      ${admin.email}`);
  console.log(`- Role:       ${admin.role}`);
  console.log(`- Status:     ${admin.onboardingStatus}`);
  console.log(`- Password:   ${adminPassword}`);
  console.log('\nYou can now log in via the web interface or API using these credentials.');
}

main()
  .catch((e) => {
    console.error('[ERROR] Bootstrap failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

