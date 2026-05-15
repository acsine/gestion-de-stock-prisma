// src/app/api/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { stockMovementSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 20;

    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }
    if (productId) where.productId = productId;
    if (type) where.type = type;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { include: { category: true } }, user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({ data: movements, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const role = (session.user as any).role;

    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

    if (!["ADMIN", "GESTIONNAIRE_STOCK"].includes(role) && !(session.user as any).isSuperAdmin) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = stockMovementSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { productId, type, quantity, reason, reference, unitPrice, note } = parsed.data;

    const product = await prisma.product.findFirst({ 
      where: { id: productId, tenantId } 
    });
    if (!product) return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });

    const isExit = type.startsWith("SORTIE");
    if (isExit && product.currentStock < quantity) {
      return NextResponse.json({ error: `Stock insuffisant. Disponible: ${product.currentStock} ${product.unit}` }, { status: 400 });
    }

    const delta = isExit ? -quantity : quantity;
    const newStock = product.currentStock + delta;

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { 
          tenantId,
          productId, 
          type, 
          quantity, 
          reason, 
          reference, 
          unitPrice, 
          note, 
          userId: (session.user as any).id 
        },
        include: { product: true, user: { select: { id: true, name: true } } },
      }),
      prisma.product.update({ where: { id: productId }, data: { currentStock: newStock } }),
    ]);

    // Generate alerts
    await generateStockAlerts(tenantId, product.id, newStock, product.minStock, product.maxStock);

    return NextResponse.json({ data: movement, message: "Mouvement enregistré" }, { status: 201 });
  } catch (error: any) {
    console.error("[API_STOCK_POST]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

async function generateStockAlerts(tenantId: string, productId: string, currentStock: number, minStock: number, maxStock: number) {
  // Clear old unread alerts for this product
  await prisma.alert.deleteMany({ where: { productId, tenantId, isRead: false } });

  if (currentStock === 0) {
    await prisma.alert.create({
      data: { tenantId, productId, type: "RUPTURE", message: "Rupture de stock — quantité zéro" },
    });
  } else if (currentStock <= minStock * 0.5) {
    await prisma.alert.create({
      data: { tenantId, productId, type: "STOCK_CRITIQUE", message: `Stock critique: ${currentStock} unités restantes` },
    });
  } else if (currentStock <= minStock) {
    await prisma.alert.create({
      data: { tenantId, productId, type: "STOCK_BAS", message: `Stock bas: ${currentStock} unités (min: ${minStock})` },
    });
  } else if (currentStock > maxStock) {
    await prisma.alert.create({
      data: { tenantId, productId, type: "SURSTOCK", message: `Surstock: ${currentStock} unités (max: ${maxStock})` },
    });
  }
}
