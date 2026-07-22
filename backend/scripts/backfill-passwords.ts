import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const usersToUpdate = [
    { email: 'richie.wong@companyx.com', password: 'Staff2026' },
    { email: 'inria.kalalo@companyx.com', password: 'Supervisor2026' },
    { email: 'jesynta.harya@companyx.com', password: 'Manager2026' },
  ];

  console.log('\n=== Backfilling Passwords for Test Accounts ===\n');

  for (const { email, password } of usersToUpdate) {
    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await prisma.user.update({
      where: { email },
      data: { passwordHash },
      select: { id: true, name: true, email: true, googleEmail: true, passwordHash: true },
    });
    console.log(`✅ Updated ${updated.name}:`);
    console.log(`   email:       ${updated.email}`);
    console.log(`   googleEmail: ${updated.googleEmail}`);
    console.log(`   hash:        ${updated.passwordHash?.substring(0, 15)}...`);
    console.log();
  }

  console.log('=== Backfill complete. ===\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
