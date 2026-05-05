
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const transactions = await prisma.transaction.findMany({ take: 1 });
  console.log("Transaction sample:", JSON.stringify(transactions, null, 2));

  const grouped = await prisma.transaction.groupBy({
    by: ["type"],
    _sum: { amount: true },
  });
  console.log("Grouped sample:", JSON.stringify(grouped, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
