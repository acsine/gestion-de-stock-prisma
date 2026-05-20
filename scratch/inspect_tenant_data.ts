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
  const tenantId = "cmpcx43ab0005h8cwmb54vjgf"; // local tenant 'Thabor Merchant Demo'
  console.log("=== INSPECTING DATA FOR TENANT:", tenantId);

  const tables = [
    "category",
    "supplier",
    "customer",
    "product",
    "invoice",
    "invoiceItem",
    "purchaseOrder",
    "orderItem",
    "stockMovement",
    "payment",
    "cashAccount",
    "transaction",
    "employee",
    "payroll",
    "leave",
    "alert",
    "setting",
  ];

  console.log("\n--- LOCAL RECORDS ---");
  for (const table of tables) {
    try {
      const records = await (localPrisma as any)[table].findMany({
        where: { tenantId }
      });
      const unsynced = records.filter((r: any) => !r.isSynced);
      console.log(`${table}: total ${records.length}, unsynced ${unsynced.length}`);
      if (records.length > 0) {
        console.log(`  Sample IDs:`, records.slice(0, 3).map((r: any) => r.id));
      }
    } catch (err: any) {
      console.error(`Error querying local ${table}:`, err.message);
    }
  }

  // Check audit log count
  try {
    const tenantUsers = await localPrisma.user.findMany({
      where: { tenantId },
      select: { id: true }
    });
    const userIds = tenantUsers.map(u => u.id);
    const auditLogs = await localPrisma.auditLog.findMany({
      where: { userId: { in: userIds } }
    });
    const unsynced = auditLogs.filter(r => !r.isSynced);
    console.log(`auditLog: total ${auditLogs.length}, unsynced ${unsynced.length}`);
  } catch (err: any) {
    console.error(`Error querying local audit logs:`, err.message);
  }

  console.log("\n--- CLOUD RECORDS ---");
  for (const table of tables) {
    try {
      const records = await (cloudPrisma as any)[table].findMany({
        where: { tenantId }
      });
      console.log(`${table}: total ${records.length}`);
    } catch (err: any) {
      console.error(`Error querying cloud ${table}:`, err.message);
    }
  }
}

run()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  });
