import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const baseWhere: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      baseWhere.tenantId = tenantId;
    } else if (tenantId) {
      baseWhere.tenantId = tenantId;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch movements of the current month
    const movements = await prisma.stockMovement.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfMonth }
      },
      include: {
        product: true,
        user: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const detailedMovements = movements
      .map((m) => {
        const buyPrice = m.product?.buyPrice || 0;
        const sellPrice = m.product?.sellPrice || 0;
        const unitPrice = m.unitPrice ?? sellPrice;
        const quantity = m.quantity || 0;

        let margin = 0;
        let hasMargin = false;

        if (m.type === "SORTIE_VENTE") {
          margin = (unitPrice - buyPrice) * quantity;
          hasMargin = true;
        } else if (m.type === "ENTREE_RETOUR") {
          margin = - (unitPrice - buyPrice) * quantity;
          hasMargin = true;
        } else if (m.type === "SORTIE_PERTE" || m.type === "SORTIE_USAGE_INTERNE") {
          margin = - buyPrice * quantity;
          hasMargin = true;
        }

        return {
          id: m.id,
          createdAt: m.createdAt,
          productName: m.product?.name || "Produit inconnu",
          productSku: m.product?.sku || "—",
          productUnit: m.product?.unit || "U",
          type: m.type,
          quantity: m.quantity,
          buyPrice,
          unitPrice,
          margin,
          hasMargin,
          user: m.user?.name || "Système"
        };
      })
      .filter((m) => m.hasMargin); // Only return the ones that contribute to margin

    const totalMargin = detailedMovements.reduce((sum, m) => sum + m.margin, 0);

    return NextResponse.json({
      data: {
        movements: detailedMovements,
        totalMargin
      }
    });
  } catch (error: any) {
    console.error("[API_DASHBOARD_MARGIN_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
