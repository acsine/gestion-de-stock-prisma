// src/app/api/finances/accounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;
  const role = (session.user as any).role;

  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true" && (role === "ADMIN" || isSuper);

  const where: any = {};
  if (!showAll) {
    where.isActive = true;
  }
  
  if (!isSuper) {
    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
    where.tenantId = tenantId;
  } else if (tenantId) {
    where.tenantId = tenantId;
  }

  const accounts = await prisma.cashAccount.findMany({ 
    where, 
    orderBy: { name: "asc" } 
  });
  return NextResponse.json({ data: accounts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const isSuper = (session.user as any).isSuperAdmin;
  const role = (session.user as any).role;
  
  // Only admins or superadmins can create accounts
  if (role !== "ADMIN" && !isSuper) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const tenantId = (session.user as any).tenantId;
  const body = await req.json();
  const { name, type, balance, currency, targetTenantId } = body;
  
  const finalTenantId = tenantId || targetTenantId;
  if (!finalTenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
  if (!name || !type) return NextResponse.json({ error: "Le nom et le type sont requis" }, { status: 400 });

  try {
    const account = await prisma.cashAccount.create({
      data: {
        tenantId: finalTenantId,
        name,
        type,
        balance: parseFloat(balance || "0"),
        currency: currency || "XAF",
        isActive: true
      }
    });

    // Audit logging
    await logActivity({
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "CashAccount",
      entityId: account.id,
      newValue: account
    });

    return NextResponse.json({ data: account, message: "Compte créé avec succès" }, { status: 201 });
  } catch (error: any) {
    console.error("[CREATE_ACCOUNT_ERROR]", error);
    return NextResponse.json({ error: "Erreur lors de la création du compte" }, { status: 500 });
  }
}

