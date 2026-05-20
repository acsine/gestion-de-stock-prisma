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

const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CLOUD_DATABASE_URL,
    },
  },
});

async function main() {
  console.log("--- CLOUD DB INSPECTION ---");
  const products = await cloudPrisma.product.findMany();
  console.log("Cloud Products:", JSON.stringify(products, null, 2));

  const movements = await cloudPrisma.stockMovement.findMany();
  console.log("Cloud Stock Movements:", JSON.stringify(movements, null, 2));

  const logs = await cloudPrisma.auditLog.findMany();
  console.log("Cloud Audit Logs count:", logs.length);
  if (logs.length > 0) {
    console.log("Cloud Audit Logs:", JSON.stringify(logs.slice(0, 5), null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => cloudPrisma.$disconnect());
