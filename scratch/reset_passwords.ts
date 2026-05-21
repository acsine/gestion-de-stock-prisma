import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("⚙️ Resetting default passwords in database...");

  const superAdminPassword = await bcrypt.hash("SuperAdmin@2026", 12);
  const merchantPassword = await bcrypt.hash("Merchant@123", 12);

  // Update SuperAdmin
  const superAdmin = await prisma.user.updateMany({
    where: { email: "superadmin@thaborsolution.com" },
    data: {
      passwordHash: superAdminPassword,
      isActive: true,
      mustChangePassword: false,
    }
  });
  console.log(`✅ SuperAdmin reset: updated ${superAdmin.count} user(s).`);

  // Update Marchand
  const merchant = await prisma.user.updateMany({
    where: { email: "marchand@thaborsolution.com" },
    data: {
      passwordHash: merchantPassword,
      isActive: true,
      mustChangePassword: false,
    }
  });
  console.log(`✅ Merchant reset: updated ${merchant.count} user(s).`);

  // Also reset caleb accounts to make sure they can log in if needed
  const caleb3 = await prisma.user.updateMany({
    where: { email: "fomocaleb3@gmail.com" },
    data: {
      passwordHash: superAdminPassword, // Resetting caleb3 to SuperAdmin@2026
      isActive: true,
      mustChangePassword: false,
    }
  });
  console.log(`✅ caleb3 reset: updated ${caleb3.count} user(s) (Password reset to: SuperAdmin@2026).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
