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

async function main() {
  const tenantId = "cmp3yindc0005128i1wtootjh"; // Local Thabor Merchant Demo
  console.log("Checking records for tenant:", tenantId);

  const products = await localPrisma.product.count({ where: { tenantId } });
  const categories = await localPrisma.category.count({ where: { tenantId } });
  const stockMovements = await localPrisma.stockMovement.count({ where: { tenantId } });
  const invoices = await localPrisma.invoice.count({ where: { tenantId } });
  const suppliers = await localPrisma.supplier.count({ where: { tenantId } });
  const customers = await localPrisma.customer.count({ where: { tenantId } });

  console.log("Products:", products);
  console.log("Categories:", categories);
  console.log("StockMovements:", stockMovements);
  console.log("Invoices:", invoices);
  console.log("Suppliers:", suppliers);
  console.log("Customers:", customers);
}

main()
  .catch(console.error)
  .finally(() => localPrisma.$disconnect());
