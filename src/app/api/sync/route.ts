// src/app/api/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SYNCABLE_MODELS } from "@/lib/sync-config";
import { auth } from "@/lib/auth";

/**
 * API de Synchronisation Multi-Tenant
 * 
 * POST: Reçoit des données (PUSH)
 * GET: Envoie les données modifiées (PULL)
 * OPTIONS: Gère les requêtes CORS preflight
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: CORS_HEADERS });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const body = await req.json();
    const { model, data } = body;

    if (!model || !SYNCABLE_MODELS.includes(model)) {
      return NextResponse.json({ error: `Modèle invalide: ${model}` }, { status: 400, headers: CORS_HEADERS });
    }

    const table = (prisma as any)[model];
    if (!table) {
      return NextResponse.json({ error: "Table non trouvée" }, { status: 404, headers: CORS_HEADERS });
    }

    console.log(`[SYNC][Tenant:${tenantId}] Réception de ${data.length} records pour ${model}`);

    const results = await prisma.$transaction(
      data.map((item: any) => {
        const { isSynced, remoteId, tenantId: itemTenantId, ...cleanData } = item;
        
        // Conversion récursive des dates si nécessaire
        Object.keys(cleanData).forEach(key => {
          if (typeof cleanData[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(cleanData[key])) {
            cleanData[key] = new Date(cleanData[key]);
          }
        });

        // Ensure we don't pass null tenantId to models that require it
        const finalTenantId = tenantId || (item.tenantId && isSuper ? item.tenantId : null);

        if (!finalTenantId && model !== "permission" && model !== "user") {
           // Skip or error? For sync push, we need a tenant.
           console.warn(`[SYNC] Record skipped for ${model}: Missing tenantId`);
           return table.findUnique({ where: { id: item.id } }); // Dummy return to keep transaction happy
        }

        return table.upsert({
          where: { id: item.id },
          update: { ...cleanData, tenantId: finalTenantId, isSynced: true },
          create: { ...cleanData, tenantId: finalTenantId, isSynced: true },
        });
      })
    );

    return NextResponse.json({ success: true, count: results.length }, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("[SYNC ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: CORS_HEADERS });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const model = searchParams.get("model");
    const lastSync = searchParams.get("lastSync");

    if (!model || !SYNCABLE_MODELS.includes(model)) {
      return NextResponse.json({ error: "Modèle invalide" }, { status: 400, headers: CORS_HEADERS });
    }

    const table = (prisma as any)[model];
    const where: any = {};
    
    // Build tenant filter
    if (!tenantId) {
      if (!isSuper) {
        return NextResponse.json({ error: "Tenant non identifié" }, { status: 400, headers: CORS_HEADERS });
      }
      // SuperAdmin with no tenantId: 
      // For global models like permission/user, we allow null tenantId.
      // For others, if tenantId is missing, we might return empty or all.
      // But for security and Prisma constraints, we must not pass null if it's required.
      if (model !== "permission" && model !== "user") {
        // Return empty or filter by something else? 
        // For sync, a SuperAdmin usually shouldn't sync "all" unless intended.
        // Let's allow it if they are super, but be careful with the filter.
        // where.tenantId = undefined; // Don't filter by tenantId
      } else {
        where.tenantId = null;
      }
    } else {
      if (model === "permission") {
        where.OR = [{ tenantId }, { tenantId: null }];
      } else if (model === "user") {
        where.tenantId = tenantId;
      } else {
        where.tenantId = tenantId;
      }
    }
    
    if (lastSync && lastSync !== "1970-01-01") {
      where.updatedAt = { gt: new Date(lastSync) };
    }

    const records = await table.findMany({
      where,
      orderBy: { updatedAt: 'asc' },
      take: 500
    });

    return NextResponse.json({ data: records }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}
