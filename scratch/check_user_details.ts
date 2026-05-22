import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: {
        include: {
          permissions: true
        }
      },
      tenant: true
    }
  });

  console.log("=== USERS DETAILS ===");
  for (const user of users) {
    console.log(`\nUser: ${user.name} (${user.email})`);
    console.log(`ID: ${user.id}`);
    console.log(`Tenant: ${user.tenant?.name || "NONE"} (${user.tenantId})`);
    console.log(`Role: ${user.role?.name || "NONE"} (${user.roleId})`);
    console.log(`Is Active: ${user.isActive}`);
    console.log(`Is SuperAdmin: ${user.isSuperAdmin}`);
    if (user.role) {
      console.log(`Role Permissions: ${user.role.permissions.map(p => p.code).join(", ") || "None"}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
