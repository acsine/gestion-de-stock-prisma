
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    include: { tenant: true }
  });
  console.log('USERS:', JSON.stringify(users, null, 2));
  
  const tenants = await prisma.tenant.findMany();
  console.log('TENANTS:', JSON.stringify(tenants, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
