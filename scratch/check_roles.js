
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const roles = await prisma.role.findMany();
    console.log('Roles in DB:', JSON.stringify(roles, null, 2));
  } catch (e) {
    console.log('Error querying roles:', e.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
