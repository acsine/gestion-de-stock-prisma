import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking implicit many-to-many join tables in database...");
  try {
    const rolePermissions = await prisma.$queryRawUnsafe(`
      SELECT * FROM "_RolePermissions" LIMIT 10
    `);
    console.log("SUCCESS! Row count or rows in _RolePermissions:", rolePermissions);
  } catch (error: any) {
    console.error("ERROR querying _RolePermissions table:", error.message);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
