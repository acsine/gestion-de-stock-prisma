import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { stockMovementSchema } from "@/lib/validations";
import { logActivity } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const warehouseId = searchParams.get("warehouseId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 20;

    const where: any = {};
    if (!isSuper) {
      let resolvedTenantId = tenantId;
      if (!resolvedTenantId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.user?.id },
          select: { tenantId: true }
        });
        resolvedTenantId = dbUser?.tenantId;
      }
      if (!resolvedTenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = resolvedTenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (warehouseId) where.warehouseId = warehouseId;

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
    const role = (session.user as any).role;
    const isSuper = (session.user as any).isSuperAdmin;

    if (!["ADMIN", "GESTIONNAIRE_STOCK"].includes(role) && !isSuper) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const body = await req.json();
    const sessionTenantId = (session.user as any).tenantId;

    const parsed = stockMovementSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { productId, type, quantity, reason, reference, unitPrice, note } = parsed.data;

    // Resolve product and its tenant from database
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    if (!product) return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });

    // Validate tenantId
    let tenantId = sessionTenantId || (isSuper ? body.tenantId || product.tenantId : null);
    if (!tenantId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user?.id },
        select: { tenantId: true }
      });
      tenantId = dbUser?.tenantId || null;
    }

    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

    // Security Check
    if (!isSuper && product.tenantId !== tenantId) {
      return NextResponse.json({ error: "Non autorisé sur ce produit" }, { status: 403 });
    }

    // Resolve target warehouse (default to main if not specified)
    let targetWarehouseId = body.warehouseId;
    if (!targetWarehouseId) {
      const mainWh = await prisma.warehouse.findFirst({
        where: { tenantId, isMain: true }
      });
      targetWarehouseId = mainWh?.id;
    }

    if (!targetWarehouseId) {
      return NextResponse.json({ error: "Aucun entrepôt configuré pour ce tenant" }, { status: 400 });
    }

    // Check warehouse-specific stock
    let whStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: targetWarehouseId,
          productId
        }
      }
    });

    const isExit = type.startsWith("SORTIE");
    const currentWhQty = whStock?.quantity || 0;
    if (isExit && currentWhQty < quantity) {
      return NextResponse.json({ error: `Stock insuffisant dans cet entrepôt. Disponible: ${currentWhQty} ${product.unit}` }, { status: 400 });
    }

    const delta = isExit ? -quantity : quantity;

    const [movement] = await prisma.$transaction(async (tx) => {
      // 1. Create StockMovement
      const m = await tx.stockMovement.create({
        data: { 
          tenantId,
          productId, 
          type, 
          quantity, 
          reason, 
          reference, 
          unitPrice, 
          note, 
          warehouseId: targetWarehouseId,
          userId: (session.user as any).id 
        },
        include: { product: true, user: { select: { id: true, name: true } } },
      });

      // 2. Update specific warehouse stock
      const updatedStock = await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: targetWarehouseId,
            productId
          }
        },
        create: {
          tenantId,
          warehouseId: targetWarehouseId,
          productId,
          quantity: delta,
          minStock: product.minStock,
          maxStock: product.maxStock
        },
        update: {
          quantity: { increment: delta }
        }
      });

      // 3. Recalculate global product stock
      const allStocks = await tx.warehouseStock.findMany({
        where: { productId }
      });
      const totalStock = allStocks.reduce((sum: number, s: any) => sum + s.quantity, 0);

      await tx.product.update({
        where: { id: productId },
        data: { currentStock: totalStock }
      });

      // 4. Generate warehouse specific alerts
      await generateWarehouseStockAlerts(tx, tenantId, targetWarehouseId, productId, updatedStock.quantity, updatedStock.minStock);

      return [m];
    });

    await logActivity({
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "StockMovement",
      entityId: movement.id,
      newValue: movement,
    });

    return NextResponse.json({ data: movement, message: "Mouvement enregistré" }, { status: 201 });
  } catch (error: any) {
    console.error("[API_STOCK_POST]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

async function generateWarehouseStockAlerts(tx: any, tenantId: string, warehouseId: string, productId: string, currentStock: number, minStock: number | null) {
  if (minStock === null) return;

  // Clear old unread alerts for this product/warehouse
  await tx.alert.deleteMany({
    where: { productId, tenantId, warehouseId, isRead: false }
  });

  const wh = await tx.warehouse.findUnique({
    where: { id: warehouseId },
    select: { name: true }
  });
  const whName = wh?.name || "Entrepôt";

  if (currentStock === 0) {
    await tx.alert.create({
      data: {
        tenantId,
        productId,
        warehouseId,
        type: "RUPTURE",
        message: `Rupture de stock dans l'entrepôt [${whName}] — quantité zéro`
      },
    });
  } else if (currentStock <= minStock) {
    await tx.alert.create({
      data: {
        tenantId,
        productId,
        warehouseId,
        type: "STOCK_BAS",
        message: `Stock bas dans l'entrepôt [${whName}] : ${currentStock} unités restantes (seuil: ${minStock})`
      },
    });
  }
}
