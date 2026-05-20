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
  const tenantId = "cmpcx43ab0005h8cwmb54vjgf"; // Thabor Merchant Demo ID
  const categoryId = "test-rec-cat-999";
  const productId = "test-rec-prod-999";

  console.log("=== PREPARING RECURSIVE PUSH TEST ===");

  // Clean up
  try {
    await localPrisma.product.delete({ where: { id: productId } });
  } catch {}
  try {
    await cloudPrisma.product.delete({ where: { id: productId } });
  } catch {}
  try {
    await localPrisma.category.delete({ where: { id: categoryId } });
  } catch {}
  try {
    await cloudPrisma.category.delete({ where: { id: categoryId } });
  } catch {}

  console.log("Creating local category (unsynced)...");
  await localPrisma.category.create({
    data: {
      id: categoryId,
      name: "Recursive Sync Cat",
      slug: "recursive-sync-cat",
      tenantId,
      isSynced: false
    }
  });

  console.log("Creating local product (unsynced)...");
  await localPrisma.product.create({
    data: {
      id: productId,
      name: "Recursive Sync Prod",
      sku: "REC-SYNC-PROD-999",
      categoryId,
      buyPrice: 100,
      sellPrice: 200,
      tenantId,
      isSynced: false
    }
  });

  console.log("Setup complete! Now running the manual sync script...");
}

run()
  .catch(console.error)
  .finally(() => localPrisma.$disconnect());
