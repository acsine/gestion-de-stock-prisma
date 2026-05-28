// src/app/api/stock/warehouses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { warehouseSchema } from "@/lib/validations";
import { logActivity } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: productId ? {
        stocks: {
          where: { productId },
          select: { quantity: true, minStock: true, maxStock: true }
        }
      } : undefined,
      orderBy: [{ isMain: "desc" }, { isShop: "desc" }, { name: "asc" }]
    });

    // Formater la réponse pour inclure directement les détails de stock si demandé
    const data = warehouses.map((wh: any) => {
      if (productId) {
        const stockEntry = wh.stocks?.[0];
        return {
          ...wh,
          quantity: stockEntry?.quantity || 0,
          minStock: stockEntry?.minStock || null,
          maxStock: stockEntry?.maxStock || null,
          stocks: undefined // masquer le tableau brut
        };
      }
      return wh;
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("[API_WAREHOUSES_GET]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const isSuper = (session.user as any).isSuperAdmin;
    const role = (session.user as any).role;

    if (!["ADMIN", "GESTIONNAIRE_STOCK"].includes(role) && !isSuper) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const tenantId = (session.user as any).tenantId;
    const body = await req.json();

    const parsed = warehouseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { name, code, location, description, isMain, isShop } = parsed.data;

    let finalTenantId = tenantId || (isSuper ? body.tenantId : null);
    if (!finalTenantId) {
      return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
    }

    // Unicité du nom
    const existing = await prisma.warehouse.findFirst({
      where: { tenantId: finalTenantId, name: name.trim() }
    });
    if (existing) {
      return NextResponse.json({ error: `Un entrepôt avec le nom "${name}" existe déjà.` }, { status: 400 });
    }

    // Si on marque cet entrepôt comme principal, décocher les autres principaux
    const warehouse = await prisma.$transaction(async (tx) => {
      if (isMain) {
        await tx.warehouse.updateMany({
          where: { tenantId: finalTenantId, isMain: true },
          data: { isMain: false }
        });
      }
      if (isShop) {
        await tx.warehouse.updateMany({
          where: { tenantId: finalTenantId, isShop: true },
          data: { isShop: false }
        });
      }

      const wh = await tx.warehouse.create({
        data: {
          tenantId: finalTenantId,
          name: name.trim(),
          code: code?.trim(),
          location: location?.trim(),
          description: description?.trim(),
          isMain,
          isShop
        }
      });

      // Initialiser le stock pour tous les produits existants de ce tenant à 0
      const products = await tx.product.findMany({
        where: { tenantId: finalTenantId },
        select: { id: true, minStock: true, maxStock: true }
      });

      if (products.length > 0) {
        await tx.warehouseStock.createMany({
          data: products.map((p) => ({
            tenantId: finalTenantId,
            warehouseId: wh.id,
            productId: p.id,
            quantity: 0,
            minStock: isShop ? Math.round(p.minStock * 0.2) : p.minStock,
            maxStock: isShop ? Math.round(p.maxStock * 0.5) : p.maxStock
          }))
        });
      }

      return wh;
    });

    await logActivity({
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "Warehouse",
      entityId: warehouse.id,
      newValue: warehouse
    });

    return NextResponse.json({ data: warehouse, message: "Entrepôt créé avec succès" }, { status: 201 });
  } catch (error: any) {
    console.error("[API_WAREHOUSES_POST]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
