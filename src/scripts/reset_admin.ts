import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 12);
  await prisma.user.update({
    where: { email: "admin@stockapigestion.com" },
    data: { passwordHash }
  });
  console.log("Admin password reset to: Admin@123");
}

main().finally(() => prisma.$disconnect());
