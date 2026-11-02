import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';

export async function ensureDefaultAccounts(): Promise<void> {
  try {
    // 1. Admin account: admin@login / admin@123
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@login' },
    });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin@123', salt);
      await prisma.user.create({
        data: {
          email: 'admin@login',
          passwordHash,
          name: 'MSK System Administrator',
          role: 'ADMIN',
          active: true,
        },
      });
      console.log('🔒 Provisioned initial Admin account: admin@login');
    }

    // 2. Account Manager account: account@login / Account@123
    const existingAccount = await prisma.user.findUnique({
      where: { email: 'account@login' },
    });

    if (!existingAccount) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Account@123', salt);
      await prisma.user.create({
        data: {
          email: 'account@login',
          passwordHash,
          name: 'MSK Account Manager',
          role: 'ACCOUNT_MANAGER',
          active: true,
        },
      });
      console.log('🔒 Provisioned initial Account Manager account: account@login');
    }

    // 3. Data Entry Operator account: operator@login / Operator@123
    const existingOperator = await prisma.user.findUnique({
      where: { email: 'operator@login' },
    });

    if (!existingOperator) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Operator@123', salt);
      await prisma.user.create({
        data: {
          email: 'operator@login',
          passwordHash,
          name: 'MSK Data Entry Operator',
          role: 'DATA_ENTRY',
          active: true,
        },
      });
      console.log('🔒 Provisioned initial Data Entry Operator account: operator@login');
    } else {
      // Ensure active and role is DATA_ENTRY
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Operator@123', salt);
      await prisma.user.update({
        where: { email: 'operator@login' },
        data: {
          role: 'DATA_ENTRY',
          active: true,
          passwordHash,
        },
      });
    }
  } catch (err) {
    console.warn('Account provisioning skipped or already executed:', (err as Error).message);
  }
}
