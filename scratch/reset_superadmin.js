
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
  const email = "superadmin@thaborsolution.com";
  const password = "admin123456";
  const hashedPassword = await bcrypt.hash(password, 12);

  console.log(`Resetting superadmin to ${email} with password: ${password}`);

  await prisma.user.upsert({
    where: { email },
    update: { 
      passwordHash: hashedPassword,
      isActive: true,
      mustChangePassword: false,
      isSuperAdmin: true
    },
    create: {
      name: "Super Administrateur ThaborSolution",
      email: email,
      passwordHash: hashedPassword,
      isSuperAdmin: true,
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log("✅ SuperAdmin reset successfully!");
}

reset().catch(console.error).finally(() => prisma.$disconnect());
