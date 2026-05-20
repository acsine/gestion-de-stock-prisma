import { PrismaClient } from "@prisma/client";

const localPrisma = new PrismaClient();
const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CLOUD_DATABASE_URL,
    },
  },
});

async function run() {
  const categoryId = "test-rec-cat-999";
  const productId = "test-rec-prod-999";

  console.log("=== CLEANING UP RECURSIVE PUSH TEST RECORDS ===");

  try {
    await localPrisma.product.delete({ where: { id: productId } });
    console.log("Deleted local product");
  } catch {}
  try {
    await cloudPrisma.product.delete({ where: { id: productId } });
    console.log("Deleted cloud product");
  } catch {}
  try {
    await localPrisma.category.delete({ where: { id: categoryId } });
    console.log("Deleted local category");
  } catch {}
  try {
    await cloudPrisma.category.delete({ where: { id: categoryId } });
    console.log("Deleted cloud category");
  } catch {}

  console.log("Cleanup complete!");
}

run()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  });
