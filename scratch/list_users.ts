import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Fetching all users from database...");
  const users = await prisma.user.findMany({
    include: {
      role: true,
    }
  });

  console.log(`\nFound ${users.length} user(s) in the database:\n`);
  users.forEach((u, i) => {
    console.log(`${i+1}. [${u.id}]`);
    console.log(`   Name: ${u.name}`);
    console.log(`   Email: ${u.email}`);
    console.log(`   Role: ${u.role?.name || "NONE"}`);
    console.log(`   Is Active: ${u.isActive}`);
    console.log(`   Must Change Password: ${u.mustChangePassword}`);
    console.log(`   Is SuperAdmin: ${u.isSuperAdmin}`);
    console.log("------------------------------------------");
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
