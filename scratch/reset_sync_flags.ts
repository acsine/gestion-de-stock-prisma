import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = "fomocaleb2@gmail.com";

async function main() {
  console.log("🔄 Réinitialisation des drapeaux de synchronisation locale...");

  // 1. Rechercher l'utilisateur ciblé dans la DB locale
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true }
  });

  if (!user || !user.tenantId) {
    console.error(`\n❌ L'utilisateur ${email} n'existe pas localement.`);
    process.exit(1);
  }

  const tenantId = user.tenantId;
  console.log(`🏢 Tenant détecté : ${user.tenant?.name} (ID: ${tenantId})`);

  // Liste des modèles qui possèdent le champ 'isSynced'
  const syncableModels = [
    "user",
    "role",
    "permission",
    "category",
    "product",
    "supplier",
    "customer",
    "stockMovement",
    "invoice",
    "invoiceItem",
    "purchaseOrder",
    "orderItem",
    "payment",
    "cashAccount",
    "transaction",
    "employee",
    "payroll",
    "leave",
    "alert",
    "setting"
  ];

  for (const model of syncableModels) {
    try {
      const table = (prisma as any)[model];
      if (table) {
        // La plupart des modèles ont 'tenantId', sauf 'permission' qui peut être globale (ou liée)
        const whereClause: any = {};
        if (model !== "permission") {
          whereClause.tenantId = tenantId;
        }

        const result = await table.updateMany({
          where: whereClause,
          data: { isSynced: false }
        });
        console.log(`✅ [${model}] ${result.count} enregistrements réinitialisés.`);
      }
    } catch (error: any) {
      console.error(`❌ Erreur lors de la réinitialisation de [${model}] :`, error.message);
    }
  }

  // Pour auditLog qui est lié via les utilisateurs
  try {
    const tenantUsers = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true }
    });
    const userIds = tenantUsers.map(u => u.id);
    const result = await prisma.auditLog.updateMany({
      where: { userId: { in: userIds } },
      data: { isSynced: false }
    });
    console.log(`✅ [auditLog] ${result.count} enregistrements réinitialisés.`);
  } catch (error: any) {
    console.error(`❌ Erreur lors de la réinitialisation de [auditLog] :`, error.message);
  }

  console.log("\n✨ Réinitialisation terminée ! Le bouton d'alerte va réapparaître.");
}

main()
  .catch((e) => {
    console.error("❌ Une erreur est survenue :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
