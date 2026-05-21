// scratch/inspect_accounts.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.cashAccount.findMany();
  console.log("=== COMPTES DE CAISSE EN BASE DE DONNÉES ===");
  console.log("Nombre total de comptes :", accounts.length);
  console.log(JSON.stringify(accounts, null, 2));

  const tenants = await prisma.tenant.findMany();
  console.log("\n=== MARCHANDS (TENANTS) EN BASE DE DONNÉES ===");
  console.log(JSON.stringify(tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
