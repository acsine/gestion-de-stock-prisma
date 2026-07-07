import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Fetching alerts...");
  try {
    const alerts = await prisma.alert.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            currentStock: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(`✅ Success! Found ${alerts.length} alerts.`);
    console.log("Alerts:", JSON.stringify(alerts.slice(0, 5), null, 2));
  } catch (error: any) {
    console.error("❌ Error fetching alerts:");
    console.error(error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
