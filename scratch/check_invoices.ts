
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    take: 1,
    include: { customer: { select: { name: true } } }
  });
  console.log("Invoice sample:", JSON.stringify(invoices, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
