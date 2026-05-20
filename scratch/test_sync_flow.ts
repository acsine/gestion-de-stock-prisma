import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CLOUD_DATABASE_URL,
    },
  },
});

async function main() {
  const tenantId = "cmpcx43ab0005h8cwmb54vjgf"; // Thabor Merchant Demo ID
  const testProductId = "test-prod-sync-123456";

  console.log("=== SYNCHRONIZATION FLOW TEST ===");
  console.log("Tenant ID:", tenantId);

  // 1. Clean up potential old test products
  console.log("\n1. Cleaning up old test data...");
  try {
    await localPrisma.product.delete({ where: { id: testProductId } });
    console.log("Deleted old test product on Local");
  } catch {}
  try {
    await cloudPrisma.product.delete({ where: { id: testProductId } });
    console.log("Deleted old test product on Cloud");
  } catch {}

  // Get a category from local to associate the product with
  // Seed might not have products or categories, let's create a temporary category
  const testCategoryId = "test-cat-sync-123456";
  try {
    await localPrisma.category.delete({ where: { id: testCategoryId } });
  } catch {}
  try {
    await cloudPrisma.category.delete({ where: { id: testCategoryId } });
  } catch {}

  console.log("Creating temporary category...");
  const category = await localPrisma.category.create({
    data: {
      id: testCategoryId,
      name: "Catégorie Test Sync",
      slug: "categorie-test-sync",
      tenantId,
      isSynced: false,
    },
  });
  console.log("Local category created:", category.id);

  // 2. Create local unsynced product
  console.log("\n2. Creating unsynced test product on Local...");
  const product = await localPrisma.product.create({
    data: {
      id: testProductId,
      tenantId,
      sku: "TSYNC-001",
      name: "Produit de Test Sync",
      buyPrice: 1000,
      sellPrice: 1500,
      categoryId: testCategoryId,
      currentStock: 10,
      isSynced: false,
    },
  });
  console.log("Local product created:", product.name, "with isSynced =", product.isSynced);

  // 3. Simulate sync push/pull for 'category' first, then 'product'
  const models = ["category", "product"] as const;

  for (const model of models) {
    const localTable = (localPrisma as any)[model];
    const cloudTable = (cloudPrisma as any)[model];

    console.log(`\n--- Syncing model: ${model} ---`);

    // PUSH
    const unsyncedLocal = await localTable.findMany({
      where: {
        tenantId,
        isSynced: false,
      },
    });

    console.log(`Found ${unsyncedLocal.length} unsynced records on Local`);

    if (unsyncedLocal.length > 0) {
      console.log(`Pushing ${unsyncedLocal.length} records to Cloud...`);
      await cloudPrisma.$transaction(
        unsyncedLocal.map((item: any) => {
          const { isSynced, ...cleanData } = item;
          return cloudTable.upsert({
            where: { id: item.id },
            update: { ...cleanData, isSynced: true },
            create: { ...cleanData, isSynced: true },
          });
        })
      );

      console.log("Marking local records as synced...");
      await localPrisma.$transaction(
        unsyncedLocal.map((item: any) => {
          return localTable.update({
            where: { id: item.id },
            data: { isSynced: true },
          });
        })
      );
    }
  }

  // 4. Verify in Cloud DB
  console.log("\n4. Verifying synchronized records on Cloud database...");
  const cloudProduct = await cloudPrisma.product.findUnique({
    where: { id: testProductId },
  });

  if (cloudProduct) {
    console.log("✅ SUCCESS: Test product found on Cloud!");
    console.log("Cloud product details:", {
      id: cloudProduct.id,
      name: cloudProduct.name,
      tenantId: cloudProduct.tenantId,
      isSynced: cloudProduct.isSynced,
    });
  } else {
    console.error("❌ FAILURE: Test product NOT found on Cloud!");
  }

  // 5. Clean up test records
  console.log("\n5. Cleaning up test records...");
  await localPrisma.product.delete({ where: { id: testProductId } });
  await cloudPrisma.product.delete({ where: { id: testProductId } });
  await localPrisma.category.delete({ where: { id: testCategoryId } });
  await cloudPrisma.category.delete({ where: { id: testCategoryId } });
  console.log("Cleanup completed!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  });
