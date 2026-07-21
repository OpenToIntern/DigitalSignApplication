/**
 * Simulates what POST /api/auth/google does:
 * looks up each new googleEmail and confirms it resolves to the correct user.
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const testEmails = [
    'jesyntaivolairia05@gmail.com',
    'cheritablemoney@gmail.com',
    'jessyharia05@gmail.com',
  ];

  console.log('\n=== OAuth lookup simulation (findUnique by googleEmail) ===\n');

  let allPassed = true;

  for (const googleEmail of testEmails) {
    const user = await prisma.user.findUnique({
      where: { googleEmail },
      select: { id: true, name: true, email: true, googleEmail: true, accessRole: true, nikVerified: true },
    });

    if (!user) {
      console.log(`❌ FAIL: No user found for googleEmail="${googleEmail}"`);
      allPassed = false;
      continue;
    }

    // Determine what handlePostAuth would return
    const nextStep = user.nikVerified ? '→ MFA OTP (nikVerified=true, skips NIK)' : '→ NIK Verification (nikVerified=false)';

    console.log(`✅ PASS: googleEmail="${googleEmail}"`);
    console.log(`   Resolves to: [${user.id}] ${user.name}`);
    console.log(`   Role:        ${user.accessRole}`);
    console.log(`   nikVerified: ${user.nikVerified}`);
    console.log(`   Post-auth:   ${nextStep}`);
    console.log();
  }

  // Also confirm old emails return nothing (no stale match)
  console.log('=== Confirming old emails no longer match ===\n');
  const oldEmails = ['companyxstaff@gmail.com', 'supervisorcompanyx1@gmail.com', 'companyxmanager@gmail.com', 'staffcompanyx@gmail.com', 'supervisorcompanyx@gmail.com', 'managercompanyx@gmail.com'];
  for (const oldEmail of oldEmails) {
    const user = await prisma.user.findUnique({ where: { googleEmail: oldEmail } });
    if (user) {
      console.log(`⚠️  WARNING: Old email "${oldEmail}" still matches user "${user.name}" — unexpected!`);
      allPassed = false;
    } else {
      console.log(`✅ Old email "${oldEmail}" correctly returns no match.`);
    }
  }

  console.log(allPassed ? '\n✅ All OAuth lookup tests PASSED.' : '\n❌ One or more tests FAILED.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
