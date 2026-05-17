// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { purchaseOrderSchema } from "@/lib/validations";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!(await hasPermission("orders.view"))) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const { id: orderId } = await params;
  const isSuperAdmin = (session.user as any).isSuperAdmin;
  const tenantId = (session.user as any).tenantId;

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { supplier: true, items: { include: { product: true } } }
    });

    if (!order) {
      return NextResponse.json({ error: "Bon de commande non trouvé" }, { status: 404 });
    }

    // Super Admin bypasses tenant checks
    if (!isSuperAdmin && order.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    return NextResponse.json({ data: order });
  } catch (error: any) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: error.message || "Erreur de chargement" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!(await hasPermission("orders.edit"))) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const { id: orderId } = await params;
  const isSuperAdmin = (session.user as any).isSuperAdmin;
  const tenantId = (session.user as any).tenantId;
  const body = await req.json();

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      return NextResponse.json({ error: "Bon de commande non trouvé" }, { status: 404 });
    }

    if (!isSuperAdmin && order.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    if (order.status === "RECU") {
      return NextResponse.json({ error: "Impossible de modifier un bon de commande déjà reçu" }, { status: 400 });
    }

    const parsed = purchaseOrderSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { supplierId, notes, expectedAt, items } = parsed.data;
    let subtotal = 0, taxAmount = 0;
    const processedItems = items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const lineTax = lineTotal * (item.taxRate / 100);
      subtotal += lineTotal;
      taxAmount += lineTax;
      return { ...item, total: lineTotal };
    });

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Delete previous items
      await tx.orderItem.deleteMany({
        where: { orderId }
      });

      // 2. Update purchase order header and create new items
      return await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          supplierId,
          notes,
          expectedAt: expectedAt ? new Date(expectedAt) : null,
          subtotal,
          taxAmount,
          total: subtotal + taxAmount,
          items: {
            create: processedItems.map((i) => ({
              tenantId: order.tenantId,
              productId: i.productId,
              quantity: i.quantity,
              receivedQty: 0,
              unitPrice: i.unitPrice,
              taxRate: i.taxRate,
              total: i.total,
            })),
          },
        },
        include: { supplier: true, items: { include: { product: true } } },
      });
    });

    return NextResponse.json({ data: updatedOrder, message: "Bon de commande mis à jour" });
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: error.message || "Erreur de mise à jour" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!(await hasPermission("orders.delete"))) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const { id: orderId } = await params;
  const isSuperAdmin = (session.user as any).isSuperAdmin;
  const tenantId = (session.user as any).tenantId;

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: "Bon de commande non trouvé" }, { status: 404 });
    }

    if (!isSuperAdmin && order.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // If order was received, rollback stock movements and supplier balance
      if (order.status === "RECU") {
        const items = await tx.orderItem.findMany({
          where: { orderId }
        });

        for (const item of items) {
          // Decrement product stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                decrement: item.quantity
              }
            }
          });
        }

        // Decrement supplier balance
        await tx.supplier.update({
          where: { id: order.supplierId },
          data: {
            balance: {
              decrement: order.total
            }
          }
        });

        // Delete related stock movements
        await tx.stockMovement.deleteMany({
          where: { orderId }
        });
      }

      // Delete the order itself (cascade deletes OrderItem automatically)
      await tx.purchaseOrder.delete({
        where: { id: orderId }
      });
    });

    return NextResponse.json({ message: "Bon de commande supprimé avec succès" });
  } catch (error: any) {
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: error.message || "Erreur lors de la suppression" }, { status: 400 });
  }
}
