import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";
import { SYNCABLE_MODELS } from "@/lib/sync-config";

// Cartographie des clés étrangères de chaque modèle vers son modèle parent associé
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


// Retourne la clause 'where' unique appropriée pour éviter les conflits d'index uniques secondaires
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
  if (modelName === "permission" && item.code) {
    return { code: item.code };
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

// S'assure de manière récursive qu'une relation existe sur le Cloud
// Helper de cartographie des noms de modèles Prisma vers leurs tables réelles PostgreSQL
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

// Helper pour comparer sémantiquement les données réelles de deux enregistrements en ignorant les méta-données de synchronisation
function areRecordsIdentical(record1: any, record2: any): boolean {
  if (!record1 || !record2) return false;
  
  const ignoreKeys = new Set(["isSynced", "updatedAt", "createdAt", "remoteId", "timestamp"]);
  const allKeys = new Set([...Object.keys(record1), ...Object.keys(record2)]);

  for (const key of allKeys) {
    if (ignoreKeys.has(key)) continue;

    const val1 = record1[key];
    const val2 = record2[key];

    // Normalisation et comparaison des dates
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

    // Normalisation et comparaison des valeurs nulles/non-définies
    if (val1 === null || val1 === undefined) {
      if (val2 !== null && val2 !== undefined) return false;
      continue;
    }
    if (val2 === null || val2 === undefined) {
      if (val1 !== null && val1 !== undefined) return false;
      continue;
    }

    // Comparaison directe ou sérialisée pour les objets/blobs
    if (typeof val1 === "object" || typeof val2 === "object") {
      if (JSON.stringify(val1) !== JSON.stringify(val2)) return false;
    } else {
      if (val1 !== val2) return false;
    }
  }

  return true;
}

// S'assure de manière récursive qu'une relation existe sur le Cloud
async function ensureRelationInCloud(modelName: string, id: string, cloudPrisma: any) {
  if (!id) return;
  const cloudTable = (cloudPrisma as any)[modelName];
  const localTable = (prisma as any)[modelName];
  if (!cloudTable || !localTable) return;

  try {
    const localRecord = await localTable.findUnique({ where: { id } });
    if (!localRecord) return;

    // Vérifier si elle existe déjà via getUniqueWhere
    const exists = await cloudTable.findUnique({ where: getUniqueWhere(modelName, localRecord), select: { id: true } });
    if (exists) return;

    // Résoudre récursivement toutes ses propres clés étrangères
    const relations = RELATION_MAP[modelName];
    if (relations) {
      for (const rel of relations) {
        const foreignId = localRecord[rel.field];
        if (foreignId) {
          await ensureRelationInCloud(rel.parentModel, foreignId, cloudPrisma);
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

    if (modelName === "role") {
      const localRolePerms = (await prisma.$queryRawUnsafe(
        `SELECT "A" FROM "_RolePermissions" WHERE "B" = $1`,
        id
      )) as { A: string }[];
      const localPermIds = localRolePerms.map((p: any) => p.A);

      await cloudPrisma.$executeRawUnsafe(
        `DELETE FROM "_RolePermissions" WHERE "B" = $1`,
        id
      );

      for (const permId of localPermIds) {
        await cloudPrisma.$executeRawUnsafe(
          `INSERT INTO "_RolePermissions" ("A", "B") VALUES ($1, $2)`,
          permId,
          id
        );
      }
    }

    // Restaurer l'horodatage original pour contourner le hook @updatedAt de Prisma en ligne
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

    // Restaurer l'horodatage original localement
    if (modelName !== "auditLog" && localRecord.updatedAt) {
      const tableName = getTableName(modelName);
      await prisma.$executeRawUnsafe(
        `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
        new Date(localRecord.updatedAt),
        id
      );
    }
    console.log(`[RECURSIVE SYNC PUSH][${modelName}] Résolu et poussé avec succès : ${id}`);
  } catch (err) {
    console.error(`[RECURSIVE SYNC PUSH ERROR][${modelName}] Échec de la résolution de ${id}:`, err);
  }
}

// S'assure de manière récursive qu'une relation existe localement
async function ensureRelationInLocal(modelName: string, id: string, cloudPrisma: any) {
  if (!id) return;
  const cloudTable = (cloudPrisma as any)[modelName];
  const localTable = (prisma as any)[modelName];
  if (!cloudTable || !localTable) return;

  try {
    const cloudRecord = await cloudTable.findUnique({ where: { id } });
    if (!cloudRecord) return;

    // Vérifier si elle existe déjà localement via getUniqueWhere
    const exists = await localTable.findUnique({ where: getUniqueWhere(modelName, cloudRecord), select: { id: true } });
    if (exists) return;

    // Résoudre récursivement toutes ses propres clés étrangères
    const relations = RELATION_MAP[modelName];
    if (relations) {
      for (const rel of relations) {
        const foreignId = cloudRecord[rel.field];
        if (foreignId) {
          await ensureRelationInLocal(rel.parentModel, foreignId, cloudPrisma);
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

    if (modelName === "role") {
      const cloudRolePerms = (await cloudPrisma.$queryRawUnsafe(
        `SELECT "A" FROM "_RolePermissions" WHERE "B" = $1`,
        id
      )) as { A: string }[];
      const cloudPermIds = cloudRolePerms.map((p: any) => p.A);

      await prisma.$executeRawUnsafe(
        `DELETE FROM "_RolePermissions" WHERE "B" = $1`,
        id
      );

      for (const permId of cloudPermIds) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "_RolePermissions" ("A", "B") VALUES ($1, $2)`,
          permId,
          id
        );
      }
    }

    // Restaurer l'horodatage original localement pour contourner @updatedAt
    if (modelName !== "auditLog" && cloudRecord.updatedAt) {
      const tableName = getTableName(modelName);
      await prisma.$executeRawUnsafe(
        `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
        new Date(cloudRecord.updatedAt),
        itemId
      );
    }
    console.log(`[RECURSIVE SYNC PULL][${modelName}] Résolu et rapatrié localement avec succès : ${id}`);
  } catch (err) {
    console.error(`[RECURSIVE SYNC PULL ERROR][${modelName}] Échec de la résolution locale de ${id}:`, err);
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const tenantId = (session.user as any).tenantId;

    if (!process.env.CLOUD_DATABASE_URL) {
      return NextResponse.json(
        { error: "Configuration CLOUD_DATABASE_URL manquante dans le fichier .env" },
        { status: 500 }
      );
    }

    // Initialiser le client Prisma secondaire pour la base de données Cloud
    const cloudPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.CLOUD_DATABASE_URL,
        },
      },
    });

    // S'assurer que le Tenant existe dans la base Cloud avant toute synchronisation
    if (tenantId) {
      const localTenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (localTenant) {
        const { licenseId, ...cleanTenant } = localTenant;
        await cloudPrisma.tenant.upsert({
          where: { id: tenantId },
          update: { ...cleanTenant },
          create: { ...cleanTenant },
        });
      }
    }

    console.log(`[CLOUD SYNC] Début de la synchronisation pour le tenant : ${tenantId}`);
    const report: Record<string, { pushed: number; pulled: number; error?: string }> = {};

    for (const model of SYNCABLE_MODELS) {
      try {
        const localTable = (prisma as any)[model];
        const cloudTable = (cloudPrisma as any)[model];

        if (!localTable || !cloudTable) continue;

        let pushedCount = 0;
        let pulledCount = 0;

        const timeField = model === "auditLog" ? "timestamp" : "updatedAt";

        // Helper robuste pour obtenir la valeur numérique de l'horodatage
        const getTimestamp = (item: any) => {
          const val = item[timeField];
          if (!val) return 0;
          return new Date(val).getTime();
        };

        // ----------------------------------------------------
        // Récupération des données locales pour comparaison
        // ----------------------------------------------------
        const localWhere: any = {};
        if (model !== "permission" && tenantId) {
          if (model === "auditLog") {
            const tenantUsers = await prisma.user.findMany({
              where: { tenantId },
              select: { id: true }
            });
            const userIds = tenantUsers.map(u => u.id);
            localWhere.userId = { in: userIds };
          } else {
            localWhere.tenantId = tenantId;
          }
        }
        const localRecords = await localTable.findMany({ where: localWhere });

        // ----------------------------------------------------
        // Récupération des données Cloud pour comparaison
        // ----------------------------------------------------
        const cloudWhere: any = {};
        if (model !== "permission" && tenantId) {
          if (model === "auditLog") {
            const tenantUsers = await cloudPrisma.user.findMany({
              where: { tenantId },
              select: { id: true }
            });
            const userIds = tenantUsers.map(u => u.id);
            cloudWhere.userId = { in: userIds };
          } else {
            cloudWhere.tenantId = tenantId;
          }
        }
        const cloudRecords = await cloudTable.findMany({ where: cloudWhere });

        // Cartographie par ID pour des comparaisons rapides en O(1)
        const localMap = new Map(localRecords.map((r: any) => [r.id, r]));
        const cloudMap = new Map(cloudRecords.map((r: any) => [r.id, r]));

        // ----------------------------------------------------
        // 1. PUSH : Pousser les données locales créées ou plus récentes
        // ----------------------------------------------------
        for (const localItem of localRecords) {
          const cloudItem = cloudMap.get(localItem.id);

          // Si les données sont déjà sémantiquement identiques sur le Cloud, on ne pousse rien
          if (model !== "role" && cloudItem && areRecordsIdentical(localItem, cloudItem)) {
            // S'assurer que le flag isSynced est true localement
            if (!localItem.isSynced) {
              await localTable.update({
                where: { id: localItem.id },
                data: { isSynced: true },
              });
              if (model !== "auditLog") {
                const tableName = getTableName(model);
                const cloudTime = getTimestamp(cloudItem);
                await prisma.$executeRawUnsafe(
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
              // Assurer récursivement toutes ses clés étrangères sur le Cloud
              const relations = RELATION_MAP[model];
              if (relations) {
                for (const rel of relations) {
                  const foreignId = localItem[rel.field];
                  if (foreignId) {
                    await ensureRelationInCloud(rel.parentModel, foreignId, cloudPrisma);
                  }
                }
              }

              // Pousser vers la DB Cloud
              const { id: itemId, isSynced, ...cleanData } = localItem;
              await cloudTable.upsert({
                where: getUniqueWhere(model, localItem),
                update: { ...cleanData, isSynced: true },
                create: { id: itemId, ...cleanData, isSynced: true },
              });

              if (model === "role") {
                const localRolePerms = (await prisma.$queryRawUnsafe(
                  `SELECT "A" FROM "_RolePermissions" WHERE "B" = $1`,
                  localItem.id
                )) as { A: string }[];
                const localPermIds = localRolePerms.map((p: any) => p.A);

                await cloudPrisma.$executeRawUnsafe(
                  `DELETE FROM "_RolePermissions" WHERE "B" = $1`,
                  localItem.id
                );

                for (const permId of localPermIds) {
                  await cloudPrisma.$executeRawUnsafe(
                    `INSERT INTO "_RolePermissions" ("A", "B") VALUES ($1, $2)`,
                    permId,
                    localItem.id
                  );
                }
              }

              // Restaurer l'horodatage correct sur le Cloud
              if (model !== "auditLog") {
                const tableName = getTableName(model);
                await cloudPrisma.$executeRawUnsafe(
                  `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                  new Date(localTime),
                  localItem.id
                );
              }

              // Marquer comme synchronisé localement
              await localTable.update({
                where: { id: localItem.id },
                data: { isSynced: true },
              });

              // Restaurer l'horodatage correct localement pour contourner @updatedAt local
              if (model !== "auditLog") {
                const tableName = getTableName(model);
                await prisma.$executeRawUnsafe(
                  `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                  new Date(localTime),
                  localItem.id
                );
              }

              pushedCount++;
            } catch (err: any) {
              console.error(`[SYNC PUSH ITEM ERROR][${model}] ID ${localItem.id}:`, err);
            }
          }
        }

        // ----------------------------------------------------
        // 2. PULL : Rapatrier les données Cloud créées ou plus récentes
        // ----------------------------------------------------
        for (const cloudItem of cloudRecords) {
          const localItem = localMap.get(cloudItem.id) as any;

          // Si les données sont déjà sémantiquement identiques localement, on ne rapatrie rien
          if (model !== "role" && localItem && areRecordsIdentical(localItem, cloudItem)) {
            // S'assurer que le flag isSynced est true localement et que updatedAt correspond
            if (!localItem.isSynced || (model !== "auditLog" && localItem.updatedAt?.getTime() !== cloudItem.updatedAt?.getTime())) {
              await localTable.update({
                where: { id: localItem.id },
                data: { isSynced: true },
              });
              if (model !== "auditLog") {
                const tableName = getTableName(model);
                const cloudTime = getTimestamp(cloudItem);
                await prisma.$executeRawUnsafe(
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
              // Assurer récursivement toutes ses clés étrangères sur le Local
              const relations = RELATION_MAP[model];
              if (relations) {
                for (const rel of relations) {
                  const foreignId = cloudItem[rel.field];
                  if (foreignId) {
                    await ensureRelationInLocal(rel.parentModel, foreignId, cloudPrisma);
                  }
                }
              }

              // Sauvegarder dans la DB locale
              const { id: itemId, isSynced, ...cleanData } = cloudItem;
              await localTable.upsert({
                where: getUniqueWhere(model, cloudItem),
                update: { ...cleanData, isSynced: true },
                create: { id: itemId, ...cleanData, isSynced: true },
              });

              if (model === "role") {
                const cloudRolePerms = (await cloudPrisma.$queryRawUnsafe(
                  `SELECT "A" FROM "_RolePermissions" WHERE "B" = $1`,
                  cloudItem.id
                )) as { A: string }[];
                const cloudPermIds = cloudRolePerms.map((p: any) => p.A);

                await prisma.$executeRawUnsafe(
                  `DELETE FROM "_RolePermissions" WHERE "B" = $1`,
                  cloudItem.id
                );

                for (const permId of cloudPermIds) {
                  await prisma.$executeRawUnsafe(
                    `INSERT INTO "_RolePermissions" ("A", "B") VALUES ($1, $2)`,
                    permId,
                    cloudItem.id
                  );
                }
              }

              // Restaurer l'horodatage correct localement (Bypass @updatedAt de Prisma)
              if (model !== "auditLog") {
                const tableName = getTableName(model);
                await prisma.$executeRawUnsafe(
                  `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                  new Date(cloudTime),
                  cloudItem.id
                );
              }

              // S'assurer que le cloud record est marqué isSynced = true
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
              console.error(`[SYNC PULL ITEM ERROR][${model}] ID ${cloudItem.id}:`, err);
            }
          }
        }

        report[model] = { pushed: pushedCount, pulled: pulledCount };
      } catch (err: any) {
        console.error(`[CLOUD SYNC ERROR][${model}]`, err);
        report[model] = { pushed: 0, pulled: 0, error: err.message };
      }
    }

    await cloudPrisma.$disconnect();
    console.log(`[CLOUD SYNC] Synchronisation terminée pour le tenant : ${tenantId}`);
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("[CLOUD SYNC ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
