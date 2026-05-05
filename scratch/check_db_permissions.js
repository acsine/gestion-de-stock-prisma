
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const permissions = await prisma.permission.findMany({ take: 5 });
    console.log('Permissions in DB:', JSON.stringify(permissions, null, 2));
  } catch (e) {
    console.log('Error querying permissions:', e.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
