// src/app/api/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SYNCABLE_MODELS } from "@/lib/sync-config";

/**
 * API de Synchronisation
 * 
 * POST: Reçoit des données (PUSH)
 * GET: Envoie les données modifiées (PULL)
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { model, data } = body;

    if (!model || !SYNCABLE_MODELS.includes(model)) {
      return NextResponse.json({ error: `Modèle invalide: ${model}` }, { status: 400 });
    }

    const table = (prisma as any)[model];
    if (!table) {
      return NextResponse.json({ error: "Table non trouvée" }, { status: 404 });
    }

    console.log(`[SYNC] Réception de ${data.length} records pour ${model}`);

    // Utilisation d'une transaction pour garantir l'intégrité
    const results = await prisma.$transaction(
      data.map((item: any) => {
        // On retire les champs de synchro pour ne pas boucler
        const { isSynced, remoteId, ...cleanData } = item;
        
        // On s'assure que les dates sont des objets Date
        if (cleanData.createdAt) cleanData.createdAt = new Date(cleanData.createdAt);
        if (cleanData.updatedAt) cleanData.updatedAt = new Date(cleanData.updatedAt);
        if (cleanData.date) cleanData.date = new Date(cleanData.date);
        if (cleanData.paidAt) cleanData.paidAt = new Date(cleanData.paidAt);
        if (cleanData.dueDate) cleanData.dueDate = new Date(cleanData.dueDate);
        if (cleanData.expectedAt) cleanData.expectedAt = new Date(cleanData.expectedAt);
        if (cleanData.startDate) cleanData.startDate = new Date(cleanData.startDate);
        if (cleanData.endDate) cleanData.endDate = new Date(cleanData.endDate);
        if (cleanData.timestamp) cleanData.timestamp = new Date(cleanData.timestamp);
        if (cleanData.dateOfBirth) cleanData.dateOfBirth = new Date(cleanData.dateOfBirth);

        return table.upsert({
          where: { id: item.id },
          update: { ...cleanData, isSynced: true },
          create: { ...cleanData, isSynced: true },
        });
      })
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error("[SYNC ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const model = searchParams.get("model");
    const lastSync = searchParams.get("lastSync");

    if (!model || !SYNCABLE_MODELS.includes(model)) {
      return NextResponse.json({ error: "Modèle invalide" }, { status: 400 });
    }

    const table = (prisma as any)[model];
    const where: any = {};
    
    if (lastSync) {
      where.updatedAt = { gt: new Date(lastSync) };
    }

    const records = await table.findMany({
      where,
      orderBy: { updatedAt: 'asc' },
      take: 500 // On limite pour éviter les timeouts
    });

    return NextResponse.json({ data: records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
