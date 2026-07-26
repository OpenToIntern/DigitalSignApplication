import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const updates = [
    { email: 'jesyntaivolairia05@gmail.com', newGoogleEmail: 'jesyntaivolairia05@gmail.com', nikVerified: false },
    { email: 'cheritablemoney@gmail.com', newGoogleEmail: 'cheritablemoney@gmail.com', nikVerified: true },
    { email: 'jessyharia05@gmail.com', newGoogleEmail: 'jessyharia05@gmail.com', nikVerified: true },
  ];

  console.log('\n=== Applying googleEmail updates ===\n');

  for (const { email, newGoogleEmail, nikVerified } of updates) {
    const updated = await prisma.user.update({
      where: { email },
      data: { googleEmail: newGoogleEmail, nikVerified },
      select: { id: true, name: true, email: true, googleEmail: true, accessRole: true, nikVerified: true },
    });
    console.log(`✅ ${updated.name} (${updated.accessRole})`);
    console.log(`   email:       ${updated.email}`);
    console.log(`   googleEmail: ${updated.googleEmail}`);
    console.log(`   nikVerified: ${updated.nikVerified}`);
    console.log();
  }

  console.log('\n=== Verification query — all three users ===\n');
  const users = await prisma.user.findMany({
    where: { email: { in: updates.map(u => u.email) } },
    select: { id: true, name: true, email: true, googleEmail: true, accessRole: true, nikVerified: true },
    orderBy: { email: 'asc' },
  });

  for (const u of users) {
    console.log(`[${u.id}] ${u.name}`);
    console.log(`  email:       ${u.email}`);
    console.log(`  googleEmail: ${u.googleEmail}`);
    console.log(`  role:        ${u.accessRole}`);
    console.log(`  nikVerified: ${u.nikVerified}`);
    console.log();
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
