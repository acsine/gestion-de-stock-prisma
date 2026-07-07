// src/app/api/alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const where: any = { isRead: false };
    if (!isSuper) {
      let resolvedTenantId = tenantId;
      if (!resolvedTenantId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { tenantId: true }
        });
        resolvedTenantId = dbUser?.tenantId;
      }
      if (!resolvedTenantId) {
        return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      }
      where.tenantId = resolvedTenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: { 
        product: { 
          select: { 
            id: true, 
            name: true, 
            sku: true, 
            unit: true, 
            currentStock: true 
          } 
        } 
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: alerts });
  } catch (error: any) {
    console.error("[API_ALERTS_GET]", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message || error },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID de l'alerte requis" }, { status: 400 });
    }
    await prisma.alert.update({ 
      where: { id }, 
      data: { isRead: true } 
    });
    return NextResponse.json({ message: "Alerte marquée lue" });
  } catch (error: any) {
    console.error("[API_ALERTS_PATCH]", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message || error },
      { status: 500 }
    );
  }
}
