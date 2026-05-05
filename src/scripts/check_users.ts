import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    include: { role: { include: { permissions: true } } }
  });
  console.log(JSON.stringify(users.map(u => ({
    email: u.email,
    role: u.role?.name,
    permCount: u.role?.permissions.length
  })), null, 2));
}
main().finally(() => prisma.$disconnect());
