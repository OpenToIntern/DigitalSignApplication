const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const DRY_RUN = process.env.EXECUTE_CLEANUP !== 'true';

  console.log(`=== STALE ACCOUNTS CLEANUP SCRIPT (PRODUCTION) ===`);
  console.log(`MODE: ${DRY_RUN ? 'DRY-RUN (Read-Only Preview)' : 'LIVE EXECUTION'}\n`);

  // Hardcoded target accounts to remove
  const targets = [
    { id: '893d2ab5-0d9b-4a4b-9882-c1a016292279', label: 'TestF' },
    { id: 'u-004', label: 'Ricky Takahindangen' }
  ];

  for (const target of targets) {
    console.log(`----------------------------------------`);
    console.log(`Checking Target: ${target.label} (ID: ${target.id})`);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: target.id },
          { email: { contains: target.label.toLowerCase(), mode: 'insensitive' } },
          { name: { contains: target.label, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.log(`Status: Account not found in DB (already deleted or absent).\n`);
      continue;
    }

    console.log(`Found DB Record: "${user.name}" | Email: ${user.email} | ID: ${user.id}`);

    // Re-verify 0 FK dependencies
    const docsCount = await prisma.document.count({ where: { senderId: user.id } });
    const signatoriesCount = await prisma.documentSignatory.count({ where: { userId: user.id } });
    const markersCount = await prisma.marker.count({ where: { assignedToId: user.id } });
    const auditLogsCount = await prisma.auditLog.count({ where: { userId: user.id } });
    const notificationsCount = await prisma.notification.count({ where: { userId: user.id } });

    console.log('FK Dependencies Check:');
    console.log(` - Documents Created:    ${docsCount}`);
    console.log(` - Signatory Entries:    ${signatoriesCount}`);
    console.log(` - Signature Markers:    ${markersCount}`);
    console.log(` - Audit Log Entries:    ${auditLogsCount}`);
    console.log(` - Notifications:        ${notificationsCount}`);

    const hasDependencies = docsCount > 0 || signatoriesCount > 0 || markersCount > 0 || auditLogsCount > 0 || notificationsCount > 0;

    if (hasDependencies) {
      console.error(`ABORT: Dependencies found for user ${user.id}! Deletion canceled to protect database integrity.\n`);
      continue;
    }

    // Check MockDukcapilRecord
    let dukcapilCount = 0;
    if (user.nik) {
      dukcapilCount = await prisma.mockDukcapilRecord.count({ where: { nik: user.nik } });
    }

    if (DRY_RUN) {
      console.log(`\n[DRY-RUN PREVIEW]:`);
      console.log(` - Would DELETE User record ID '${user.id}' (${user.email})`);
      if (dukcapilCount > 0) {
        console.log(` - Would DELETE MockDukcapilRecord NIK '${user.nik}' (${dukcapilCount} row)`);
      }
      console.log(`Status: READY FOR DELETION (0 dependencies verified).\n`);
      continue;
    }

    // LIVE EXECUTION inside transaction
    await prisma.$transaction(async (tx) => {
      if (user.nik && dukcapilCount > 0) {
        await tx.mockDukcapilRecord.deleteMany({ where: { nik: user.nik } });
      }
      await tx.user.delete({ where: { id: user.id } });
    });

    console.log(`\nLIVE DELETION COMPLETED: Successfully deleted user ${user.id} ("${user.name}").\n`);
  }

  if (DRY_RUN) {
    console.log('----------------------------------------');
    console.log('No database modifications were made.');
    console.log('To execute live on production, run: EXECUTE_CLEANUP=true node scripts/cleanup-stale-accounts.js\n');
  }
}

main()
  .catch(err => console.error('Cleanup script error:', err))
  .finally(() => prisma.$disconnect());
