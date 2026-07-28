const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PRODUCTION DATABASE AUDIT: STALE / TEST ACCOUNTS ===');
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'ricky', mode: 'insensitive' } },
        { name: { contains: 'Ricky', mode: 'insensitive' } },
        { name: { contains: 'TestF', mode: 'insensitive' } },
        { email: { contains: 'testf', mode: 'insensitive' } },
        { name: { equals: 'richie' } },
        { email: { equals: 'richie' } }
      ]
    }
  });

  if (users.length === 0) {
    console.log('No matching target accounts found in DB.');
    return;
  }

  for (const u of users) {
    const docsSent = await prisma.document.count({ where: { senderId: u.id } });
    const signatories = await prisma.documentSignatory.count({ where: { userId: u.id } });
    const markers = await prisma.marker.count({ where: { assignedToId: u.id } });
    const auditLogs = await prisma.auditLog.count({ where: { userId: u.id } });
    const notifications = await prisma.notification.count({ where: { userId: u.id } });

    console.log('\n----------------------------------------');
    console.log(`Target User: "${u.name}" (ID: ${u.id})`);
    console.log(`Email: ${u.email}`);
    console.log(`Access Role: ${u.accessRole}`);
    console.log(`NIK: ${u.nik || 'None'} (Verified: ${u.nikVerified})`);
    console.log('Dependencies Breakdown:');
    console.log(` - Documents Created (senderId): ${docsSent}`);
    console.log(` - Signatory Assignments:        ${signatories}`);
    console.log(` - Canvas Markers Assigned:      ${markers}`);
    console.log(` - Audit Log Entries:            ${auditLogs}`);
    console.log(` - Notifications:                ${notifications}`);
    
    const isSafe = docsSent === 0 && signatories === 0 && markers === 0 && auditLogs === 0 && notifications === 0;
    console.log(`STATUS: ${isSafe ? 'SAFE TO DELETE (0 FK dependencies)' : 'DEPENDENCIES EXIST (Cleanup required)'}`);
  }
  console.log('----------------------------------------\n');
}

main()
  .catch(err => {
    console.error('Audit script execution error:', err);
  })
  .finally(() => prisma.$disconnect());
