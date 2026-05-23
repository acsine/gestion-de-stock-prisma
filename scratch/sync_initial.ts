import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env file
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

const emailArgIndex = process.argv.indexOf("--email");
const passwordArgIndex = process.argv.indexOf("--password");

if (emailArgIndex === -1 || passwordArgIndex === -1) {
  console.error("❌ Arguments manquants. Utilisation : npx tsx scratch/sync_initial.ts --email <email> --password <password>");
  process.exit(1);
}

const email = process.argv[emailArgIndex + 1];
const password = process.argv[passwordArgIndex + 1];

if (!process.env.CLOUD_DATABASE_URL) {
  console.error("❌ CLOUD_DATABASE_URL non configuré dans le fichier .env");
  process.exit(1);
}

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

async function alignLocalId(modelName: string, oldId: string, newId: string) {
  if (oldId === newId) return;
  const tableName = getTableName(modelName);
  console.log(`  [ALIGN ID][${modelName}] Correction de l'ID local de ${oldId} vers l'ID cloud ${newId}...`);
  await localPrisma.$executeRawUnsafe(
    `UPDATE "${tableName}" SET "id" = $1 WHERE "id" = $2`,
    newId,
    oldId
  );
}

async function ensureRelationInLocal(modelName: string, id: string) {
  if (!id) return;
  const cloudTable = (cloudPrisma as any)[modelName];
  const localTable = (localPrisma as any)[modelName];
  if (!cloudTable || !localTable) return;

  try {
    const cloudRecord = await cloudTable.findUnique({ where: { id } });
    if (!cloudRecord) return;

    const uniqueWhere = getUniqueWhere(modelName, cloudRecord);
    const exists = await localTable.findUnique({ where: uniqueWhere, select: { id: true } });
    if (exists) {
      if (exists.id !== id) {
        await alignLocalId(modelName, exists.id, id);
      }
      return;
    }

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
    console.log(`  [RECURSIVE PULL][${modelName}] Rapatriement de la dépendance : ${id}`);
  } catch (err: any) {
    console.error(`  [RECURSIVE PULL ERROR][${modelName}] Échec de la dépendance ${id} :`, err.message);
  }
}

async function run() {
  console.log(`🔍 Connexion à la base de données cloud pour authentifier ${email}...`);

  // 1. Rechercher l'utilisateur en ligne par e-mail
  const cloudUser = await cloudPrisma.user.findUnique({
    where: { email },
    include: {
      tenant: true,
      role: true
    }
  });

  if (!cloudUser) {
    console.error(`❌ Aucun utilisateur en ligne trouvé avec l'adresse email : ${email}`);
    process.exit(1);
  }

  // 2. Valider le mot de passe
  const isPasswordValid = await bcrypt.compare(password, cloudUser.passwordHash);
  if (!isPasswordValid) {
    console.error(`❌ Mot de passe en ligne incorrect pour l'adresse email : ${email}`);
    process.exit(1);
  }

  console.log(`✅ Authentification en ligne réussie !`);
  console.log(`🏢 Tenant associé : ${cloudUser.tenant?.name || "N/A"} (${cloudUser.tenantId})`);
  console.log(`👤 Rôle : ${cloudUser.role?.name || "N/A"}`);

  const tenantId = cloudUser.tenantId;

  // 3. Importer le Tenant localement
  if (tenantId && cloudUser.tenant) {
    console.log(`📥 Importation du tenant localement...`);
    const { licenseId, ...cleanTenant } = cloudUser.tenant;

    const existingWithSlug = await localPrisma.tenant.findUnique({
      where: { slug: cleanTenant.slug }
    });
    if (existingWithSlug && existingWithSlug.id !== tenantId) {
      await alignLocalId("tenant", existingWithSlug.id, tenantId);
    }

    await localPrisma.tenant.upsert({
      where: { id: tenantId },
      update: { ...cleanTenant },
      create: { ...cleanTenant },
    });
    console.log("✅ Tenant importé.");
  }

  // 4. Importer le Rôle de l'utilisateur localement
  if (cloudUser.roleId && cloudUser.role) {
    console.log(`📥 Importation du rôle localement...`);
    const { id: roleId, isSynced, ...cleanRole } = cloudUser.role;

    const uniqueWhere = getUniqueWhere("role", cloudUser.role);
    const existingRole = await localPrisma.role.findUnique({
      where: uniqueWhere
    });
    if (existingRole && existingRole.id !== roleId) {
      await alignLocalId("role", existingRole.id, roleId);
    }

    await localPrisma.role.upsert({
      where: { id: roleId },
      update: { ...cleanRole, isSynced: true },
      create: { id: roleId, ...cleanRole, isSynced: true },
    });
    console.log("✅ Rôle importé.");
  }

  // 5. Importer l'Utilisateur localement
  console.log(`📥 Importation du compte utilisateur localement...`);
  const { id: userId, isSynced, role, tenant, ...cleanUser } = cloudUser;

  const existingUser = await localPrisma.user.findUnique({
    where: { email }
  });
  if (existingUser && existingUser.id !== userId) {
    await alignLocalId("user", existingUser.id, userId);
  }

  await localPrisma.user.upsert({
    where: { email },
    update: { ...cleanUser, isSynced: true } as any,
    create: { id: userId, ...cleanUser, isSynced: true } as any,
  });
  console.log("✅ Compte utilisateur importé.");

  // 6. Rapatrier toutes les données associées pour ce Tenant
  if (tenantId) {
    console.log(`\n🔄 Début de la synchronisation complète de vos données en ligne...`);
    const report: Record<string, any> = {};

    for (const model of SYNCABLE_MODELS) {
      try {
        const localTable = (localPrisma as any)[model];
        const cloudTable = (cloudPrisma as any)[model];

        if (!localTable || !cloudTable) continue;

        let pulledCount = 0;
        const timeField = model === "auditLog" ? "timestamp" : "updatedAt";

        const getTimestamp = (item: any) => {
          const val = item[timeField];
          if (!val) return 0;
          return new Date(val).getTime();
        };

        // Récupérer tous les enregistrements en ligne pour ce tenant
        const cloudWhere: any = {};
        if (model !== "permission") {
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

        // Récupérer tous les enregistrements locaux correspondants
        const localWhere: any = {};
        if (model !== "permission") {
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
        const localRecords = await localTable.findMany({ where: localWhere });
        const localMap = new Map(localRecords.map((r: any) => [r.id, r]));

        // Boucle d'importation
        for (const cloudItem of cloudRecords) {
          // Check if exists by unique criteria first to avoid ID mismatches
          const uniqueWhere = getUniqueWhere(model, cloudItem);
          const existsByUnique = await localTable.findUnique({ where: uniqueWhere, select: { id: true } });
          
          if (existsByUnique && existsByUnique.id !== cloudItem.id) {
            await alignLocalId(model, existsByUnique.id, cloudItem.id);
            const updatedLocalItem = await localTable.findUnique({ where: { id: cloudItem.id } });
            if (updatedLocalItem) {
              localMap.set(cloudItem.id, updatedLocalItem);
            }
          }

          const localItem = localMap.get(cloudItem.id) as any;

          if (localItem && areRecordsIdentical(localItem, cloudItem)) {
            continue;
          }

          const cloudTime = getTimestamp(cloudItem);
          let shouldPull = false;

          if (!localItem) {
            shouldPull = true;
          } else {
            const localTime = getTimestamp(localItem);
            if (cloudTime > localTime) {
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
                    await ensureRelationInLocal(rel.parentModel, foreignId);
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

              if (model !== "auditLog") {
                const tableName = getTableName(model);
                await localPrisma.$executeRawUnsafe(
                  `UPDATE "${tableName}" SET "updatedAt" = $1 WHERE id = $2`,
                  new Date(cloudTime),
                  cloudItem.id
                );
              }

              pulledCount++;
            } catch (err: any) {
              console.error(`❌ [PULL ERROR][${model}] ID ${cloudItem.id} :`, err.message);
            }
          }
        }

        report[model] = pulledCount;
        if (pulledCount > 0) {
          console.log(`📊 [${model.toUpperCase()}] ${pulledCount} éléments importés avec succès.`);
        }
      } catch (err: any) {
        console.error(`❌ Erreur lors de la synchronisation du modèle ${model} :`, err.message);
      }
    }
    console.log(`\n🎉 SYNCHRONISATION INITIALE RÉUSSIE !`);
  }
}

run()
  .catch(err => {
    console.error("❌ Une erreur critique est survenue lors de la synchronisation :", err);
    process.exit(1);
  })
  .finally(async () => {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  });
