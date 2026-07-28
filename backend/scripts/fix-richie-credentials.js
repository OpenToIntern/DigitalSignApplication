const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const DRY_RUN = process.env.EXECUTE_FIX !== 'true';

  console.log(`=== RICHIE EMERGENCY CREDENTIAL FIX SCRIPT ===`);
  console.log(`MODE: ${DRY_RUN ? 'DRY-RUN (Read-Only Preview)' : 'LIVE EXECUTION'}\n`);

  const targetId = 'u-001';
  const targetEmail = 'jesyntaivolairia05@gmail.com';
  const targetPasswordHash = '$2b$12$2ow8nUwQO1CQUiPlN7NfmODfL6cHll8HgVyo9bFJiygihAcB6XhL.';

  // 1. Verify target user u-001 exists
  const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
  if (!targetUser) {
    console.error(`ERROR: User with ID '${targetId}' not found in DB.`);
    return;
  }

  // 2. Check if any OTHER user currently holds the target email
  const existingEmailOwner = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (existingEmailOwner && existingEmailOwner.id !== targetId) {
    console.error(`CONFLICT ERROR: Another user (ID: ${existingEmailOwner.id}, Name: "${existingEmailOwner.name}") currently holds email '${targetEmail}'. Cannot update.`);
    return;
  }

  // 3. Count FK references on u-001 to verify document history
  const docsCount = await prisma.document.count({ where: { senderId: targetId } });
  const signatoriesCount = await prisma.documentSignatory.count({ where: { userId: targetId } });
  const markersCount = await prisma.marker.count({ where: { assignedToId: targetId } });
  const auditLogsCount = await prisma.auditLog.count({ where: { userId: targetId } });
  const notificationsCount = await prisma.notification.count({ where: { userId: targetId } });

  console.log('Current u-001 Account State:');
  console.log(` - ID:                   ${targetUser.id}`);
  console.log(` - Name:                 ${targetUser.name}`);
  console.log(` - Current Email:        ${targetUser.email}`);
  console.log(` - Current PasswordHash: ${targetUser.passwordHash}`);
  console.log('\nVerified FK References Attached to u-001:');
  console.log(` - Documents (senderId): ${docsCount}`);
  console.log(` - Signatory Entries:    ${signatoriesCount}`);
  console.log(` - Signature Markers:    ${markersCount}`);
  console.log(` - Audit Log Entries:    ${auditLogsCount}`);
  console.log(` - Notifications:        ${notificationsCount}`);

  console.log('\nProposed Emergency Update Payload:');
  console.log(` - email:        '${targetEmail}'`);
  console.log(` - passwordHash: '${targetPasswordHash}'`);
  console.log(` - nikVerified:  true`);
  console.log(` - nik:          '3175010101990001'`);

  if (DRY_RUN) {
    console.log('\n[DRY-RUN PREVIEW]: No database modifications made.');
    console.log('To execute live on production, run: EXECUTE_FIX=true node scripts/fix-richie-credentials.js');
    return;
  }

  // LIVE EXECUTION
  await prisma.user.update({
    where: { id: targetId },
    data: {
      email: targetEmail,
      googleEmail: targetEmail,
      passwordHash: targetPasswordHash,
      name: 'Richie Frederico Wong',
      nik: '3175010101990001',
      nikVerified: true,
      accessRole: 'user'
    }
  });

  console.log('\nLIVE EXECUTION COMPLETED SUCCESSFULLY!');
  console.log(`u-001 email updated to '${targetEmail}' and passwordHash restored to Richie's real captured credential.`);
}

main()
  .catch(err => console.error('Emergency fix error:', err))
  .finally(() => prisma.$disconnect());
