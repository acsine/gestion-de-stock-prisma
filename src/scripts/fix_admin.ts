import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const adminRole = await (prisma as any).role.findUnique({ where: { name: "ADMIN" } });
  if (adminRole) {
    await prisma.user.update({
      where: { email: "admin@stockapigestion.com" },
      data: { roleId: adminRole.id }
    });
    console.log("Admin user updated to ADMIN role");
  } else {
    console.log("Admin role not found");
  }
}
main().finally(() => prisma.$disconnect());
