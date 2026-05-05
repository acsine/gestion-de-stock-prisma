
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = ["User", "Role", "Permission", "Category", "Product", "Supplier", "Customer", "Invoice", "Setting"];
  for (const table of tables) {
    try {
      const records = await (prisma as any)[table.toLowerCase()].findMany();
      const str = JSON.stringify(records);
      if (str.toLowerCase().includes("cfms")) {
        console.log(`Found "CFMS" in table ${table}`);
        const matches = records.filter((r: any) => JSON.stringify(r).toLowerCase().includes("cfms"));
        console.log(matches);
      }
    } catch (e) {
      // console.log(`Table ${table} not found or error: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
