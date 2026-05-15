// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  console.log("[SETTINGS API] Session User:", JSON.stringify(session.user, null, 2));

  let tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;

  // Fallback if session is incomplete
  if (!tenantId && !isSuper) {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { tenantId: true }
    });
    tenantId = user?.tenantId;
    console.log(`[SETTINGS API] Fallback tenantId: ${tenantId}`);
  }

  const { searchParams } = new URL(req.url);
  const queryTenantId = searchParams.get("tenantId");

  if (isSuper && queryTenantId) {
    tenantId = queryTenantId;
  }

  if (!tenantId) {
    if (isSuper) {
      return NextResponse.json({ data: {}, message: "Veuillez spécifier un tenantId pour voir ses paramètres" });
    }
    return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
  }

  console.log(`[SETTINGS] Fetching for tenantId: ${tenantId}`);
  const settings = await prisma.setting.findMany({ 
    where: { tenantId } 
  });
  
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  console.log(`[SETTINGS] Found ${settings.length} keys`);
  return NextResponse.json({ 
    data: settingsMap,
    debug: {
      tenantId,
      isSuper,
      count: settings.length
    }
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  console.log("[SETTINGS API POST] Session User:", JSON.stringify(session.user, null, 2));

  let tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;
  
  // Fallback if session is incomplete
  if (!tenantId && !isSuper) {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { tenantId: true }
    });
    tenantId = user?.tenantId;
  }
  
  if ((session.user as any).role !== "ADMIN" && !isSuper) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  if (!isSuper && !tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

  const body = await req.json();
  const targetTenantId = tenantId || (body.tenantId as string);

  if (!targetTenantId) {
    return NextResponse.json({ 
      error: `Tenant ID requis pour les paramètres. (Session: ${tenantId || 'null'}, IsSuper: ${isSuper})` 
    }, { status: 400 });
  }

  console.log(`[SETTINGS] Saving for tenantId: ${targetTenantId}`);

  try {
    const entries = Object.entries(body).filter(([k]) => k !== "tenantId");
    
    // Batch upsert (or sequential for safety with tenantId_key)
    for (const [key, value] of entries) {
      if (!key) continue;
      await prisma.setting.upsert({
        where: { 
          tenantId_key: { 
            tenantId: targetTenantId, 
            key 
          } 
        },
        update: { value: String(value) },
        create: { 
          tenantId: targetTenantId, 
          key, 
          value: String(value) 
        },
      });
    }

    console.log(`[SETTINGS] Successfully saved ${entries.length} settings`);
    return NextResponse.json({ message: "Paramètres sauvegardés" });
  } catch (error: any) {
    console.error("[SETTINGS SAVE ERROR]", error);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
  }
}
