// scratch/check_permissions.ts
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Checking database...");
  const perms = await prisma.permission.findMany();
  console.log(`Found ${perms.length} permissions in the database:`);
  console.log(JSON.stringify(perms, null, 2));

  const roles = await prisma.role.findMany({
    include: { permissions: true }
  });
  console.log(`Found ${roles.length} roles in the database:`);
  console.log(JSON.stringify(roles, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
