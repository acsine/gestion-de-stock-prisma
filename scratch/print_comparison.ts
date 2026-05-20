import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env");
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
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const cloudPrisma = new PrismaClient({
  datasources: { db: { url: process.env.CLOUD_DATABASE_URL } }
});

async function main() {
  const localProducts = await localPrisma.product.findMany();
  const cloudProducts = await cloudPrisma.product.findMany();

  console.log("\n--- LOCAL PRODUCTS RAW ---");
  for (const p of localProducts) {
    console.log({
      id: p.id,
      sku: p.sku,
      name: p.name,
      updatedAt: p.updatedAt,
      updatedAt_time: p.updatedAt?.getTime(),
      isSynced: p.isSynced,
      tenantId: p.tenantId,
    });
  }

  console.log("\n--- CLOUD PRODUCTS RAW ---");
  for (const p of cloudProducts) {
    console.log({
      id: p.id,
      sku: p.sku,
      name: p.name,
      updatedAt: p.updatedAt,
      updatedAt_time: p.updatedAt?.getTime(),
      isSynced: p.isSynced,
      tenantId: p.tenantId,
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  });
