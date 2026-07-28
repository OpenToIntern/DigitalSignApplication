const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const DRY_RUN = process.env.EXECUTE_CONSOLIDATION !== 'true';

  console.log(`=== RICHIE ACCOUNT CONSOLIDATION SCRIPT ===`);
  console.log(`MODE: ${DRY_RUN ? 'DRY-RUN (Read-Only Preview)' : 'LIVE EXECUTION'}\n`);

  // Step 1: Find both candidate records
  const targetIdSeed = 'u-001';
  const duplicateId = '883a8d0e-1c37-4621-91e1-1acfd07eb1ab';

  const seededUser = await prisma.user.findUnique({ where: { id: targetIdSeed } });
  const duplicateUser = await prisma.user.findUnique({ where: { id: duplicateId } });

  console.log('1. SEEDED OFFICIAL ROW (u-001):');
  console.log(seededUser ? JSON.stringify(seededUser, null, 2) : '   [NOT FOUND in DB]');

  console.log('\n2. DUPLICATE MANUAL ROW (883a8d0e-1c37-4621-91e1-1acfd07eb1ab):');
  console.log(duplicateUser ? JSON.stringify(duplicateUser, null, 2) : '   [NOT FOUND in DB]');

  if (!duplicateUser) {
    console.log('\nDuplicate account not found. No consolidation needed.');
    return;
  }

  // Case A: u-001 does NOT exist (Only 883a8d0e-1c37-4621-91e1-1acfd07eb1ab exists)
  if (!seededUser) {
    console.log('\n---> SCENARIO A: Only duplicate ID row exists.');
    console.log('Action: Update row 883a8d0e-1c37-4621-91e1-1acfd07eb1ab to official name "Richie Frederico Wong" and email.');
    
    if (DRY_RUN) {
      console.log('\n[DRY-RUN PREVIEW]: No database modifications made.');
      console.log('To execute live, set EXECUTE_CONSOLIDATION=true node scripts/consolidate-richie.js');
      return;
    }

    await prisma.user.update({
      where: { id: duplicateId },
      data: {
        name: 'Richie Frederico Wong',
        email: 'jesyntaivolairia05@gmail.com',
        googleEmail: 'jesyntaivolairia05@gmail.com',
        nik: '3175010101990001',
        nikVerified: true,
        accessRole: 'user'
      }
    });
    console.log('\nSUCCESS: Updated user account to official Richie Frederico Wong.');
    return;
  }

  // Case B: BOTH rows exist separately
  console.log('\n---> SCENARIO B: Both rows exist separately. Merging duplicate into u-001.');

  // Capture email and passwordHash from duplicate row before deletion
  const capturedEmail = duplicateUser.email;
  const capturedPasswordHash = duplicateUser.passwordHash;

  console.log('\nCredential Transfer Plan:');
  console.log(` - Target Account ID:       ${targetIdSeed}`);
  console.log(` - Current Email on u-001:  ${seededUser.email}`);
  console.log(` - New Email on u-001:      ${capturedEmail}`);
  console.log(` - Password Hash Transfer:  ${capturedPasswordHash ? 'Preserving actual user passwordHash from duplicate row' : 'No passwordHash found on duplicate'}`);

  // Count FK dependencies on duplicateUser
  const docsCount = await prisma.document.count({ where: { senderId: duplicateId } });
  const signatoriesCount = await prisma.documentSignatory.count({ where: { userId: duplicateId } });
  const markersCount = await prisma.marker.count({ where: { assignedToId: duplicateId } });
  const auditLogsCount = await prisma.auditLog.count({ where: { userId: duplicateId } });
  const notificationsCount = await prisma.notification.count({ where: { userId: duplicateId } });

  console.log('\nDependencies to reassign from duplicate to u-001:');
  console.log(` - Documents (senderId):      ${docsCount}`);
  console.log(` - Signatory Assignments:     ${signatoriesCount}`);
  console.log(` - Signature Markers:         ${markersCount}`);
  console.log(` - Audit Log Entries:         ${auditLogsCount}`);
  console.log(` - Notification Entries:      ${notificationsCount}`);

  if (DRY_RUN) {
    console.log('\n[DRY-RUN PREVIEW]: The following atomic updates would be executed inside a Prisma transaction:');
    console.log(` 1. Capture email ('${capturedEmail}') & passwordHash from duplicate row (${duplicateId}).`);
    console.log(` 2. UPDATE Document SET senderId = 'u-001' WHERE senderId = '${duplicateId}' (${docsCount} rows)`);
    console.log(` 3. UPDATE DocumentSignatory SET userId = 'u-001' WHERE userId = '${duplicateId}' (${signatoriesCount} rows)`);
    console.log(` 4. UPDATE Marker SET assignedToId = 'u-001' WHERE assignedToId = '${duplicateId}' (${markersCount} rows)`);
    console.log(` 5. UPDATE AuditLog SET userId = 'u-001' WHERE userId = '${duplicateId}' (${auditLogsCount} rows)`);
    console.log(` 6. UPDATE Notification SET userId = 'u-001' WHERE userId = '${duplicateId}' (${notificationsCount} rows)`);
    console.log(` 7. DELETE User WHERE id = '${duplicateId}' (1 row) -> Frees unique email constraint for '${capturedEmail}'.`);
    console.log(` 8. UPDATE User SET email = '${capturedEmail}', passwordHash = [capturedHash] WHERE id = 'u-001'.`);
    console.log('\nNo changes made. To execute live, set EXECUTE_CONSOLIDATION=true node scripts/consolidate-richie.js');
    return;
  }

  // LIVE EXECUTION inside a single Prisma Transaction
  await prisma.$transaction(async (tx) => {
    // 1. Reassign Documents
    if (docsCount > 0) {
      await tx.document.updateMany({
        where: { senderId: duplicateId },
        data: { senderId: targetIdSeed }
      });
    }

    // 2. Reassign DocumentSignatories (skip duplicates if u-001 already assigned to same doc)
    if (signatoriesCount > 0) {
      const dupSigs = await tx.documentSignatory.findMany({ where: { userId: duplicateId } });
      for (const sig of dupSigs) {
        const existingTargetSig = await tx.documentSignatory.findUnique({
          where: { documentId_userId: { documentId: sig.documentId, userId: targetIdSeed } }
        });
        if (existingTargetSig) {
          await tx.documentSignatory.delete({ where: { id: sig.id } });
        } else {
          await tx.documentSignatory.update({
            where: { id: sig.id },
            data: { userId: targetIdSeed }
          });
        }
      }
    }

    // 3. Reassign Canvas Markers
    if (markersCount > 0) {
      await tx.marker.updateMany({
        where: { assignedToId: duplicateId },
        data: { assignedToId: targetIdSeed }
      });
    }

    // 4. Reassign Audit Logs
    if (auditLogsCount > 0) {
      await tx.auditLog.updateMany({
        where: { userId: duplicateId },
        data: { userId: targetIdSeed }
      });
    }

    // 5. Reassign Notifications
    if (notificationsCount > 0) {
      await tx.notification.updateMany({
        where: { userId: duplicateId },
        data: { userId: targetIdSeed }
      });
    }

    // 6. Delete duplicate user row (Frees unique email constraint)
    await tx.user.delete({
      where: { id: duplicateId }
    });

    // 7. Update u-001 with captured email & passwordHash
    await tx.user.update({
      where: { id: targetIdSeed },
      data: {
        name: 'Richie Frederico Wong',
        email: capturedEmail,
        passwordHash: capturedPasswordHash,
        nik: '3175010101990001',
        nikVerified: true,
        accessRole: 'user'
      }
    });
  });

  console.log('\nLIVE EXECUTION COMPLETED SUCCESSFULLY!');
  console.log('All documents, signatories, markers, audit logs, and notifications have been reassigned to u-001.');
  console.log(`Official u-001 account updated with email '${capturedEmail}' and actual passwordHash.`);
  console.log('Duplicate user account 883a8d0e-1c37-4621-91e1-1acfd07eb1ab has been safely removed.');
}

main()
  .catch(err => console.error('Consolidation error:', err))
  .finally(() => prisma.$disconnect());
