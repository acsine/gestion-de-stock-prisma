import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log("Activating and promoting fomocaleb3@gmail.com...");
  try {
    const updatedUser = await prisma.user.update({
      where: { email: "fomocaleb3@gmail.com" },
      data: {
        isActive: true,
        isSuperAdmin: true
      }
    });
    console.log("Success! Updated user:", JSON.stringify(updatedUser, null, 2));
  } catch (error) {
    console.error("Error updating user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
