import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";
import { SYNCABLE_MODELS } from "@/lib/sync-config";

// Cartographie des clés étrangères de chaque modèle vers son modèle parent associé
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
    await cloudTable.upsert({
      where: getUniqueWhere(modelName, localRecord),
      update: { ...cleanData, isSynced: true },
      create: { id: itemId, ...cleanData, isSynced: true },
    });

    await localTable.update({
      where: { id },
      data: { isSynced: true },
    });
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
    await localTable.upsert({
      where: getUniqueWhere(modelName, cloudRecord),
      update: { ...cleanData, isSynced: true },
      create: { id: itemId, ...cleanData, isSynced: true },
    });
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

        // ----------------------------------------------------
        // 1. PUSH : Envoyer les données locales non synchronisées vers le Cloud
        // ----------------------------------------------------
        const pushWhere: any = {};
        if (model !== "permission" && tenantId) {
          if (model === "auditLog") {
            const tenantUsers = await prisma.user.findMany({
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
          console.log(`[SYNC][${model}] Push de ${unsyncedLocal.length} enregistrements vers le Cloud...`);
          
          for (const item of unsyncedLocal) {
            try {
              // Assurer récursivement toutes ses clés étrangères locales
              const relations = RELATION_MAP[model];
              if (relations) {
                for (const rel of relations) {
                  const foreignId = item[rel.field];
                  if (foreignId) {
                    await ensureRelationInCloud(rel.parentModel, foreignId, cloudPrisma);
                  }
                }
              }

              // Pousser vers la DB Cloud
              const { id: itemId, isSynced, ...cleanData } = item;
              await cloudTable.upsert({
                where: getUniqueWhere(model, item),
                update: { ...cleanData, isSynced: true },
                create: { id: itemId, ...cleanData, isSynced: true },
              });

              // Marquer comme synchronisé localement
              await localTable.update({
                where: { id: item.id },
                data: { isSynced: true },
              });

              pushedCount++;
            } catch (err: any) {
              console.error(`[SYNC PUSH ITEM ERROR][${model}] ID ${item.id}:`, err);
            }
          }
        }

        // ----------------------------------------------------
        // 2. PULL : Récupérer les données du Cloud vers le Local
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
        
        const lastLocalRecord = await localTable.findFirst({
          where: localWhere,
          orderBy: { [timeField]: "desc" },
        });

        const pullWhere: any = {};
        if (model !== "permission" && tenantId) {
          if (model === "auditLog") {
            const tenantUsers = await prisma.user.findMany({
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
          console.log(`[SYNC][${model}] Pull de ${cloudNewRecords.length} enregistrements depuis le Cloud...`);
          
          for (const item of cloudNewRecords) {
            try {
              // Assurer récursivement toutes ses clés étrangères sur le Local
              const relations = RELATION_MAP[model];
              if (relations) {
                for (const rel of relations) {
                  const foreignId = item[rel.field];
                  if (foreignId) {
                    await ensureRelationInLocal(rel.parentModel, foreignId, cloudPrisma);
                  }
                }
              }

              // Sauvegarder dans la DB locale
              const { id: itemId, isSynced, ...cleanData } = item;
              await localTable.upsert({
                where: getUniqueWhere(model, item),
                update: { ...cleanData, isSynced: true },
                create: { id: itemId, ...cleanData, isSynced: true },
              });

              pulledCount++;
            } catch (err: any) {
              console.error(`[SYNC PULL ITEM ERROR][${model}] ID ${item.id}:`, err);
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
