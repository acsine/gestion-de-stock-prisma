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
  const localProducts = await localPrisma.product.findMany();
  const cloudProducts = await cloudPrisma.product.findMany();

  console.log("=== LOCAL PRODUCTS ===");
  console.log(JSON.stringify(localProducts, null, 2));

  console.log("=== CLOUD PRODUCTS ===");
  console.log(JSON.stringify(cloudProducts, null, 2));
}

run()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  });
