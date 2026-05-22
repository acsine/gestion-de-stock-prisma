import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting database roles and permissions fix...");

  // 1. Fetch all global permissions
  const globalPermissions = await prisma.permission.findMany();
  console.log(`Found ${globalPermissions.length} global permissions.`);

  // 2. Fetch all roles named "ADMIN"
  const adminRoles = await prisma.role.findMany({
    where: { name: "ADMIN" }
  });
  console.log(`Found ${adminRoles.length} ADMIN roles in the database.`);

  // 3. Connect all global permissions to every ADMIN role
  for (const role of adminRoles) {
    console.log(`Updating ADMIN role [${role.id}] for tenant [${role.tenantId}]...`);
    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: globalPermissions.map(p => ({ id: p.id }))
        }
      }
    });
    console.log(`Successfully mapped all ${globalPermissions.length} permissions to ADMIN role [${role.id}].`);
  }

  // 4. Find users with null roleId and assign them their tenant's ADMIN role if they are admins,
  // or default to ADMIN if they are the main user.
  // For fomocaleb2@gmail.com, let's assign them the ADMIN role of their tenant (AlphaVision).
  const userToFix = await prisma.user.findUnique({
    where: { email: "fomocaleb2@gmail.com" },
    include: { tenant: { include: { roles: true } } }
  });

  if (userToFix) {
    console.log(`\nFound user ${userToFix.email} with tenant: ${userToFix.tenant?.name}`);
    const adminRole = userToFix.tenant?.roles.find(r => r.name === "ADMIN");
    if (adminRole) {
      console.log(`Assigning ADMIN role [${adminRole.id}] to user ${userToFix.email}...`);
      await prisma.user.update({
        where: { id: userToFix.id },
        data: { roleId: adminRole.id }
      });
      console.log("User successfully updated!");
    } else {
      console.log("❌ ADMIN role not found for tenant AlphaVision!");
    }
  } else {
    console.log("User fomocaleb2@gmail.com not found in the database.");
  }

  console.log("\n✅ Database fix completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
