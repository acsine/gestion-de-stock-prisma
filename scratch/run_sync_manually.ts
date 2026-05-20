import { PrismaClient } from "@prisma/client";

const localPrisma = new PrismaClient();
const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CLOUD_DATABASE_URL,
    },
  },
});

const SYNCABLE_MODELS = [
  "role",
  "permission",
  "user",
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
  "auditLog"
];

const RELATION_MAP: Record<string, { field: string; parentModel: string }[]> = {
  user: [
    { field: "roleId", parentModel: "role" }
  ],
  category: [
    { field: "parentId", parentModel: "category" }
  ],
  product: [
    { field: "categoryId", parentModel: "category" },
    { field: "supplierId", parentModel: "supplier" }
  ],
  stockMovement: [
    { field: "productId", parentModel: "product" },
    { field: "userId", parentModel: "user" },
    { field: "invoiceId", parentModel: "invoice" },
    { field: "orderId", parentModel: "purchaseOrder" }
  ],
  invoice: [
    { field: "customerId", parentModel: "customer" },
    { field: "userId", parentModel: "user" }
  ],
  invoiceItem: [
    { field: "invoiceId", parentModel: "invoice" },
    { field: "productId", parentModel: "product" }
  ],
  purchaseOrder: [
    { field: "supplierId", parentModel: "supplier" },
    { field: "userId", parentModel: "user" }
  ],
  orderItem: [
    { field: "orderId", parentModel: "purchaseOrder" },
    { field: "productId", parentModel: "product" }
  ],
  payment: [
    { field: "invoiceId", parentModel: "invoice" }
  ],
  transaction: [
    { field: "accountId", parentModel: "cashAccount" },
    { field: "userId", parentModel: "user" },
    { field: "supplierId", parentModel: "supplier" }
  ],
  employee: [
    { field: "userId", parentModel: "user" }
  ],
  payroll: [
    { field: "employeeId", parentModel: "employee" },
    { field: "processedById", parentModel: "user" }
  ],
  leave: [
    { field: "employeeId", parentModel: "employee" }
  ],
  alert: [
    { field: "productId", parentModel: "product" }
  ],
  auditLog: [
    { field: "userId", parentModel: "user" }
  ]
};

function getUniqueWhere(modelName: string, item: any): any {
  if (modelName === "setting" && item.tenantId && item.key) {
    return { tenantId_key: { tenantId: item.tenantId, key: item.key } };
  }
  if (modelName === "role" && item.tenantId && item.name) {
    return { tenantId_name: { tenantId: item.tenantId, name: item.name } };
  }
  if (modelName === "category" && item.tenantId && item.slug) {
    return { tenantId_slug: { tenantId: item.tenantId, slug: item.slug } };
  }
  if (modelName === "product" && item.tenantId && item.sku) {
    return { tenantId_sku: { tenantId: item.tenantId, sku: item.sku } };
  }
  if (modelName === "user" && item.email) {
    return { email: item.email };
  }
  if (modelName === "invoice" && item.number) {
    return { number: item.number };
  }
  if (modelName === "purchaseOrder" && item.number) {
    return { number: item.number };
  }
  if (modelName === "payroll" && item.employeeId && item.month !== undefined && item.year !== undefined) {
    return { employeeId_month_year: { employeeId: item.employeeId, month: item.month, year: item.year } };
  }
  return { id: item.id };
}

async function ensureRelationInCloud(modelName: string, id: string) {
  if (!id) return;
  const cloudTable = (cloudPrisma as any)[modelName];
  const localTable = (localPrisma as any)[modelName];
  if (!cloudTable || !localTable) return;

  try {
    const localRecord = await localTable.findUnique({ where: { id } });
    if (!localRecord) return;

    const exists = await cloudTable.findUnique({ where: getUniqueWhere(modelName, localRecord), select: { id: true } });
    if (exists) return;

    const relations = RELATION_MAP[modelName];
    if (relations) {
      for (const rel of relations) {
        const foreignId = localRecord[rel.field];
        if (foreignId) {
          await ensureRelationInCloud(rel.parentModel, foreignId);
        }
      }
    }

    const { id: itemId, isSynced, ...cleanData } = localRecord;
    await cloudTable.upsert({
      where: getUniqueWhere(modelName, localRecord),
      update: { ...cleanData, isSynced: true },
      create: { id: itemId, ...cleanData, isSynced: true },
    });

    await localTable.update({
      where: { id },
      data: { isSynced: true },
    });
    console.log(`  [RECURSIVE PUSH][${modelName}] Synced dependency: ${id}`);
  } catch (err: any) {
    console.error(`  [RECURSIVE PUSH ERROR][${modelName}] Failed dependency ${id}:`, err.message);
  }
}

async function ensureRelationInLocal(modelName: string, id: string) {
  if (!id) return;
  const cloudTable = (cloudPrisma as any)[modelName];
  const localTable = (localPrisma as any)[modelName];
  if (!cloudTable || !localTable) return;

  try {
    const cloudRecord = await cloudTable.findUnique({ where: { id } });
    if (!cloudRecord) return;

    const exists = await localTable.findUnique({ where: getUniqueWhere(modelName, cloudRecord), select: { id: true } });
    if (exists) return;

    const relations = RELATION_MAP[modelName];
    if (relations) {
      for (const rel of relations) {
        const foreignId = cloudRecord[rel.field];
        if (foreignId) {
          await ensureRelationInLocal(rel.parentModel, foreignId);
        }
      }
    }

    const { id: itemId, isSynced, ...cleanData } = cloudRecord;
    await localTable.upsert({
      where: getUniqueWhere(modelName, cloudRecord),
      update: { ...cleanData, isSynced: true },
      create: { id: itemId, ...cleanData, isSynced: true },
    });
    console.log(`  [RECURSIVE PULL][${modelName}] Synced dependency: ${id}`);
  } catch (err: any) {
    console.error(`  [RECURSIVE PULL ERROR][${modelName}] Failed dependency ${id}:`, err.message);
  }
}

async function run() {
  const tenantId = "cmpcx43ab0005h8cwmb54vjgf"; // Thabor Merchant Demo ID
  console.log("=== RUNNING RECURSIVE MANUAL SYNC FOR TENANT:", tenantId);

  // S'assurer que le Tenant existe dans la base Cloud avant toute synchronisation
  if (tenantId) {
    const localTenant = await localPrisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (localTenant) {
      const { licenseId, ...cleanTenant } = localTenant;
      await cloudPrisma.tenant.upsert({
        where: { id: tenantId },
        update: { ...cleanTenant },
        create: { ...cleanTenant },
      });
      console.log("Tenant verified on Cloud");
    }
  }

  const report: Record<string, any> = {};

  for (const model of SYNCABLE_MODELS) {
    try {
      const localTable = (localPrisma as any)[model];
      const cloudTable = (cloudPrisma as any)[model];

      if (!localTable || !cloudTable) continue;

      let pushedCount = 0;
      let pulledCount = 0;

      const timeField = model === "auditLog" ? "timestamp" : "updatedAt";

      // PUSH
      const pushWhere: any = {};
      if (model !== "permission" && tenantId) {
        if (model === "auditLog") {
          const tenantUsers = await localPrisma.user.findMany({
            where: { tenantId },
            select: { id: true }
          });
          const userIds = tenantUsers.map(u => u.id);
          pushWhere.userId = { in: userIds };
        } else {
          pushWhere.tenantId = tenantId;
        }
      }
      pushWhere.isSynced = false;

      const unsyncedLocal = await localTable.findMany({ where: pushWhere });

      if (unsyncedLocal.length > 0) {
        console.log(`[PUSH][${model}] pushing ${unsyncedLocal.length} items...`);
        for (const item of unsyncedLocal) {
          try {
            // Resolve relations recursively
            const relations = RELATION_MAP[model];
            if (relations) {
              for (const rel of relations) {
                const foreignId = item[rel.field];
                if (foreignId) {
                  await ensureRelationInCloud(rel.parentModel, foreignId);
                }
              }
            }

            const { id: itemId, isSynced, ...cleanData } = item;
            await cloudTable.upsert({
              where: getUniqueWhere(model, item),
              update: { ...cleanData, isSynced: true },
              create: { id: itemId, ...cleanData, isSynced: true },
            });
            
            await localTable.update({
              where: { id: item.id },
              data: { isSynced: true },
            });
            pushedCount++;
          } catch (err: any) {
            console.error(`[PUSH ERROR][${model}] ID ${item.id}:`, err.message);
          }
        }
      }

      // PULL
      const localWhere: any = {};
      if (model !== "permission" && tenantId) {
        if (model === "auditLog") {
          const tenantUsers = await localPrisma.user.findMany({
            where: { tenantId },
            select: { id: true }
          });
          const userIds = tenantUsers.map(u => u.id);
          localWhere.userId = { in: userIds };
        } else {
          localWhere.tenantId = tenantId;
        }
      }
      
      const lastLocalRecord = await localTable.findFirst({
        where: localWhere,
        orderBy: { [timeField]: "desc" },
      });

      const pullWhere: any = {};
      if (model !== "permission" && tenantId) {
        if (model === "auditLog") {
          const tenantUsers = await localPrisma.user.findMany({
            where: { tenantId },
            select: { id: true }
          });
          const userIds = tenantUsers.map(u => u.id);
          pullWhere.userId = { in: userIds };
        } else {
          pullWhere.tenantId = tenantId;
        }
      }
      if (lastLocalRecord) {
        pullWhere[timeField] = { gt: lastLocalRecord[timeField] };
      }

      const cloudNewRecords = await cloudTable.findMany({ where: pullWhere });

      if (cloudNewRecords.length > 0) {
        console.log(`[PULL][${model}] pulling ${cloudNewRecords.length} items...`);
        for (const item of cloudNewRecords) {
          try {
            // Resolve relations recursively
            const relations = RELATION_MAP[model];
            if (relations) {
              for (const rel of relations) {
                const foreignId = item[rel.field];
                if (foreignId) {
                  await ensureRelationInLocal(rel.parentModel, foreignId);
                }
              }
            }

            const { id: itemId, isSynced, ...cleanData } = item;
            await localTable.upsert({
              where: getUniqueWhere(model, item),
              update: { ...cleanData, isSynced: true },
              create: { id: itemId, ...cleanData, isSynced: true },
            });
            pulledCount++;
          } catch (err: any) {
            console.error(`[PULL ERROR][${model}] ID ${item.id}:`, err.message);
          }
        }
      }

      report[model] = { pushed: pushedCount, pulled: pulledCount, status: "SUCCESS" };
    } catch (err: any) {
      report[model] = { pushed: 0, pulled: 0, status: "ERROR", error: err.message };
    }
  }

  console.log("\n=== FINAL RECURSIVE SYNC REPORT ===");
  console.log(JSON.stringify(report, null, 2));
}

run()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  });
