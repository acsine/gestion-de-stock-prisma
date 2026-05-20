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

const localPrisma = new PrismaClient();
const cloudPrisma = new PrismaClient({
  datasources: { db: { url: process.env.CLOUD_DATABASE_URL } }
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
    { field: "roleId", parentModel: "role" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  role: [
    { field: "tenantId", parentModel: "tenant" }
  ],
  permission: [
    { field: "tenantId", parentModel: "tenant" }
  ],
  category: [
    { field: "parentId", parentModel: "category" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  product: [
    { field: "categoryId", parentModel: "category" },
    { field: "supplierId", parentModel: "supplier" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  supplier: [
    { field: "tenantId", parentModel: "tenant" }
  ],
  customer: [
    { field: "tenantId", parentModel: "tenant" }
  ],
  stockMovement: [
    { field: "productId", parentModel: "product" },
    { field: "userId", parentModel: "user" },
    { field: "invoiceId", parentModel: "invoice" },
    { field: "orderId", parentModel: "purchaseOrder" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  invoice: [
    { field: "customerId", parentModel: "customer" },
    { field: "userId", parentModel: "user" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  invoiceItem: [
    { field: "invoiceId", parentModel: "invoice" },
    { field: "productId", parentModel: "product" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  purchaseOrder: [
    { field: "supplierId", parentModel: "supplier" },
    { field: "userId", parentModel: "user" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  orderItem: [
    { field: "orderId", parentModel: "purchaseOrder" },
    { field: "productId", parentModel: "product" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  payment: [
    { field: "invoiceId", parentModel: "invoice" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  cashAccount: [
    { field: "tenantId", parentModel: "tenant" }
  ],
  transaction: [
    { field: "accountId", parentModel: "cashAccount" },
    { field: "userId", parentModel: "user" },
    { field: "supplierId", parentModel: "supplier" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  employee: [
    { field: "userId", parentModel: "user" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  payroll: [
    { field: "employeeId", parentModel: "employee" },
    { field: "processedById", parentModel: "user" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  leave: [
    { field: "employeeId", parentModel: "employee" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  alert: [
    { field: "productId", parentModel: "product" },
    { field: "tenantId", parentModel: "tenant" }
  ],
  setting: [
    { field: "tenantId", parentModel: "tenant" }
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

function getTableName(modelName: string): string {
  const map: Record<string, string> = {
    tenant: "tenants",
    user: "users",
    role: "roles",
    permission: "permissions",
    category: "categories",
    product: "products",
    supplier: "suppliers",
    customer: "customers",
    stockMovement: "stock_movements",
    invoice: "invoices",
    invoiceItem: "invoice_items",
    purchaseOrder: "purchase_orders",
    orderItem: "order_items",
    payment: "payments",
    cashAccount: "cash_accounts",
    transaction: "transactions",
    employee: "employees",
    payroll: "payrolls",
    leave: "leaves",
    alert: "alerts",
    auditLog: "audit_logs",
    setting: "settings",
    license: "licenses",
    ticket: "support_tickets",
    ticketMessage: "support_ticket_messages"
  };
  return map[modelName] || modelName;
}

function areRecordsIdentical(record1: any, record2: any): boolean {
  if (!record1 || !record2) return false;
  
  const ignoreKeys = new Set(["isSynced", "updatedAt", "createdAt", "remoteId", "timestamp"]);
  const allKeys = new Set([...Object.keys(record1), ...Object.keys(record2)]);

  for (const key of allKeys) {
    if (ignoreKeys.has(key)) continue;

    const val1 = record1[key];
    const val2 = record2[key];

    if (
      val1 instanceof Date || 
      val2 instanceof Date || 
      (typeof val1 === "string" && !isNaN(Date.parse(val1)) && val1.includes("T")) || 
      (typeof val2 === "string" && !isNaN(Date.parse(val2)) && val2.includes("T"))
    ) {
      const d1 = val1 ? new Date(val1).getTime() : 0;
      const d2 = val2 ? new Date(val2).getTime() : 0;
      if (d1 !== d2) return false;
      continue;
    }

    if (val1 === null || val1 === undefined) {
      if (val2 !== null && val2 !== undefined) return false;
      continue;
    }
    if (val2 === null || val2 === undefined) {
      if (val1 !== null && val1 !== undefined) return false;
      continue;
    }

    if (typeof val1 === "object" || typeof val2 === "object") {
      if (JSON.stringify(val1) !== JSON.stringify(val2)) return false;
    } else {
      if (val1 !== val2) return false;
    }
  }

  return true;
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
    if (modelName === "tenant") {
      delete (cleanData as any).licenseId;
    }
    const extraFields = modelName === "tenant" ? {} : { isSynced: true };
    await cloudTable.upsert({
      where: getUniqueWhere(modelName, localRecord),
      update: { ...cleanData, ...extraFields },
      create: { id: itemId, ...cleanData, ...extraFields },
    });

    if (modelName !== "auditLog" && localRecord.updatedAt) {
      const tableName = getTableName(modelName);
      await cloudPrisma.$executeRawUnsafe(
        `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
        new Date(localRecord.updatedAt),
        itemId
      );
    }

    if (modelName !== "tenant") {
      await localTable.update({
        where: { id },
        data: { isSynced: true },
      });
    }

    if (modelName !== "auditLog" && localRecord.updatedAt) {
      const tableName = getTableName(modelName);
      await localPrisma.$executeRawUnsafe(
        `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
        new Date(localRecord.updatedAt),
        id
      );
    }
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
    if (modelName === "tenant") {
      delete (cleanData as any).licenseId;
    }
    const extraFields = modelName === "tenant" ? {} : { isSynced: true };
    await localTable.upsert({
      where: getUniqueWhere(modelName, cloudRecord),
      update: { ...cleanData, ...extraFields },
      create: { id: itemId, ...cleanData, ...extraFields },
    });

    if (modelName !== "auditLog" && cloudRecord.updatedAt) {
      const tableName = getTableName(modelName);
      await localPrisma.$executeRawUnsafe(
        `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
        new Date(cloudRecord.updatedAt),
        itemId
      );
    }
    console.log(`  [RECURSIVE PULL][${modelName}] Synced dependency: ${id}`);
  } catch (err: any) {
    console.error(`  [RECURSIVE PULL ERROR][${modelName}] Failed dependency ${id}:`, err.message);
  }
}

async function run() {
  console.log("=== RUNNING RECURSIVE SYNC AS SUPERADMIN ===");

  const report: Record<string, any> = {};

  for (const model of SYNCABLE_MODELS) {
    try {
      const localTable = (localPrisma as any)[model];
      const cloudTable = (cloudPrisma as any)[model];

      if (!localTable || !cloudTable) continue;

      let pushedCount = 0;
      let pulledCount = 0;

      const timeField = model === "auditLog" ? "timestamp" : "updatedAt";
      const getTimestamp = (item: any) => {
        const val = item[timeField];
        if (!val) return 0;
        return new Date(val).getTime();
      };

      // Query all records for both sides
      const localRecords = await localTable.findMany();
      const cloudRecords = await cloudTable.findMany();

      const localMap = new Map(localRecords.map((r: any) => [r.id, r]));
      const cloudMap = new Map(cloudRecords.map((r: any) => [r.id, r]));

      // 1. PUSH
      for (const localItem of localRecords) {
        const cloudItem = cloudMap.get(localItem.id);

        if (cloudItem && areRecordsIdentical(localItem, cloudItem)) {
          if (!localItem.isSynced) {
            await localTable.update({
              where: { id: localItem.id },
              data: { isSynced: true },
            });
            if (model !== "auditLog") {
              const tableName = getTableName(model);
              const cloudTime = getTimestamp(cloudItem);
              await localPrisma.$executeRawUnsafe(
                `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                new Date(cloudTime),
                localItem.id
              );
            }
          }
          continue;
        }

        const localTime = getTimestamp(localItem);
        let shouldPush = false;

        if (!cloudItem) {
          shouldPush = true;
        } else {
          const cloudTime = getTimestamp(cloudItem);
          if (localTime > cloudTime || !localItem.isSynced) {
            shouldPush = true;
          }
        }

        if (shouldPush) {
          try {
            const relations = RELATION_MAP[model];
            if (relations) {
              for (const rel of relations) {
                const foreignId = localItem[rel.field];
                if (foreignId) {
                  await ensureRelationInCloud(rel.parentModel, foreignId);
                }
              }
            }

            const { id: itemId, isSynced, ...cleanData } = localItem;
            await cloudTable.upsert({
              where: getUniqueWhere(model, localItem),
              update: { ...cleanData, isSynced: true },
              create: { id: itemId, ...cleanData, isSynced: true },
            });

            if (model !== "auditLog") {
              const tableName = getTableName(model);
              await cloudPrisma.$executeRawUnsafe(
                `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                new Date(localTime),
                localItem.id
              );
            }

            await localTable.update({
              where: { id: localItem.id },
              data: { isSynced: true },
            });

            if (model !== "auditLog") {
              const tableName = getTableName(model);
              await localPrisma.$executeRawUnsafe(
                `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                new Date(localTime),
                localItem.id
              );
            }

            pushedCount++;
          } catch (err: any) {
            console.error(`[PUSH ERROR][${model}] ID ${localItem.id}:`, err.message);
          }
        }
      }

      // 2. PULL
      for (const cloudItem of cloudRecords) {
        const localItem = localMap.get(cloudItem.id) as any;

        if (localItem && areRecordsIdentical(localItem, cloudItem)) {
          if (!localItem.isSynced || (model !== "auditLog" && localItem.updatedAt?.getTime() !== cloudItem.updatedAt?.getTime())) {
            await localTable.update({
              where: { id: localItem.id },
              data: { isSynced: true },
            });
            if (model !== "auditLog") {
              const tableName = getTableName(model);
              const cloudTime = getTimestamp(cloudItem);
              await localPrisma.$executeRawUnsafe(
                `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                new Date(cloudTime),
                localItem.id
              );
            }
          }
          continue;
        }

        const cloudTime = getTimestamp(cloudItem);
        let shouldPull = false;

        if (!localItem) {
          shouldPull = true;
        } else {
          const localTime = getTimestamp(localItem);
          if (cloudTime > localTime || !cloudItem.isSynced) {
            shouldPull = true;
          }
        }

        if (shouldPull) {
          try {
            const relations = RELATION_MAP[model];
            if (relations) {
              for (const rel of relations) {
                const foreignId = cloudItem[rel.field];
                if (foreignId) {
                  await ensureRelationInLocal(rel.parentModel, foreignId);
                }
              }
            }

            const { id: itemId, isSynced, ...cleanData } = cloudItem;
            await localTable.upsert({
              where: getUniqueWhere(model, cloudItem),
              update: { ...cleanData, isSynced: true },
              create: { id: itemId, ...cleanData, isSynced: true },
            });

            if (model !== "auditLog") {
              const tableName = getTableName(model);
              await localPrisma.$executeRawUnsafe(
                `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                new Date(cloudTime),
                cloudItem.id
              );
            }

            if (!cloudItem.isSynced) {
              await cloudTable.update({
                where: { id: cloudItem.id },
                data: { isSynced: true },
              });
              if (model !== "auditLog") {
                const tableName = getTableName(model);
                await cloudPrisma.$executeRawUnsafe(
                  `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                  new Date(cloudTime),
                  cloudItem.id
                );
              }
            }

            pulledCount++;
          } catch (err: any) {
            console.error(`[PULL ERROR][${model}] ID ${cloudItem.id}:`, err.message);
          }
        }
      }

      report[model] = { pushed: pushedCount, pulled: pulledCount, status: "SUCCESS" };
    } catch (err: any) {
      report[model] = { pushed: 0, pulled: 0, status: "ERROR", error: err.message };
    }
  }

  console.log("\n=== FINAL RECURSIVE SYNC REPORT (SUPERADMIN) ===");
  console.log(JSON.stringify(report, null, 2));
}

run()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  });
