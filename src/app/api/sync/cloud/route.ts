import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";
import { SYNCABLE_MODELS } from "@/lib/sync-config";

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
    const report: Record<string, { pushed: number; pulled: number }> = {};

    for (const model of SYNCABLE_MODELS) {
      const localTable = (prisma as any)[model];
      const cloudTable = (cloudPrisma as any)[model];

      if (!localTable || !cloudTable) continue;

      let pushedCount = 0;
      let pulledCount = 0;

      // ----------------------------------------------------
      // 1. PUSH : Envoyer les données locales non synchronisées vers le Cloud
      // ----------------------------------------------------
      const pushWhere: any = {};
      if (model !== "permission" && tenantId) {
        pushWhere.tenantId = tenantId;
      }
      pushWhere.isSynced = false;

      const unsyncedLocal = await localTable.findMany({ where: pushWhere });

      if (unsyncedLocal.length > 0) {
        console.log(`[SYNC][${model}] Push de ${unsyncedLocal.length} enregistrements vers le Cloud...`);
        
        // Pousser vers la DB Cloud
        await cloudPrisma.$transaction(
          unsyncedLocal.map((item: any) => {
            const { isSynced, ...cleanData } = item;
            return cloudTable.upsert({
              where: { id: item.id },
              update: { ...cleanData, isSynced: true },
              create: { ...cleanData, isSynced: true },
            });
          })
        );

        // Marquer comme synchronisés localement
        await prisma.$transaction(
          unsyncedLocal.map((item: any) => {
            return localTable.update({
              where: { id: item.id },
              data: { isSynced: true },
            });
          })
        );
        pushedCount = unsyncedLocal.length;
      }

      // ----------------------------------------------------
      // 2. PULL : Récupérer les données du Cloud vers le Local
      // ----------------------------------------------------
      const localWhere: any = {};
      if (model !== "permission" && tenantId) {
        localWhere.tenantId = tenantId;
      }
      
      const lastLocalRecord = await localTable.findFirst({
        where: localWhere,
        orderBy: { updatedAt: "desc" },
      });

      const pullWhere: any = {};
      if (model !== "permission" && tenantId) {
        pullWhere.tenantId = tenantId;
      }
      if (lastLocalRecord) {
        pullWhere.updatedAt = { gt: lastLocalRecord.updatedAt };
      }

      const cloudNewRecords = await cloudTable.findMany({ where: pullWhere });

      if (cloudNewRecords.length > 0) {
        console.log(`[SYNC][${model}] Pull de ${cloudNewRecords.length} enregistrements depuis le Cloud...`);
        
        // Sauvegarder dans la DB locale
        await prisma.$transaction(
          cloudNewRecords.map((item: any) => {
            const { isSynced, ...cleanData } = item;
            return localTable.upsert({
              where: { id: item.id },
              update: { ...cleanData, isSynced: true },
              create: { ...cleanData, isSynced: true },
            });
          })
        );
        pulledCount = cloudNewRecords.length;
      }

      report[model] = { pushed: pushedCount, pulled: pulledCount };
    }

    await cloudPrisma.$disconnect();
    console.log(`[CLOUD SYNC] Synchronisation terminée avec succès pour le tenant : ${tenantId}`);
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("[CLOUD SYNC ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
