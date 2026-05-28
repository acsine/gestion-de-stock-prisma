// src/app/api/reports/best-sellers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categoryId = searchParams.get("categoryId");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const metric = searchParams.get("metric") || "quantity"; // quantity | revenue

    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    // Exclure les devis, factures annulées ou proforma des ventes réelles (ne garder que FACTURE ou ce qui est payé/envoyé)
    where.invoice = {
      type: "FACTURE",
      status: { notIn: ["ANNULE", "BROUILLON"] }
    };

    // Filtre de dates
    if (startDate && endDate) {
      where.invoice.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else {
      // Période par défaut : les 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.invoice.createdAt = {
        gte: thirtyDaysAgo
      };
    }

    // Filtre par catégorie
    if (categoryId) {
      where.product = {
        categoryId
      };
    }

    // Récupérer tous les items de facture correspondants
    const items = await prisma.invoiceItem.findMany({
      where,
      include: {
        product: {
          select: { name: true, sku: true, unit: true, category: { select: { name: true } } }
        }
      }
    });

    // Agréger en mémoire pour une flexibilité et robustesse maximales
    const aggregation: Record<string, {
      productId: string;
      name: string;
      sku: string;
      category: string;
      unit: string;
      quantitySold: number;
      revenueGenerated: number;
    }> = {};

    for (const item of items) {
      const prod = item.product;
      if (!prod) continue;

      if (!aggregation[item.productId]) {
        aggregation[item.productId] = {
          productId: item.productId,
          name: prod.name,
          sku: prod.sku,
          category: prod.category?.name || "Sans catégorie",
          unit: prod.unit,
          quantitySold: 0,
          revenueGenerated: 0
        };
      }

      aggregation[item.productId].quantitySold += item.quantity;
      aggregation[item.productId].revenueGenerated += item.total;
    }

    // Convertir en tableau et trier selon la métrique choisie
    const list = Object.values(aggregation);
    list.sort((a, b) => {
      if (metric === "revenue") {
        return b.revenueGenerated - a.revenueGenerated;
      }
      return b.quantitySold - a.quantitySold;
    });

    // Limiter la taille
    const slicedList = list.slice(0, limit);

    return NextResponse.json({
      data: slicedList,
      debug: {
        totalItemsCount: items.length,
        aggregatedProductsCount: list.length,
        metric,
        limit
      }
    });

  } catch (error: any) {
    console.error("[API_BEST_SELLERS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
