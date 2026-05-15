// src/app/api/orders/[id]/receive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: orderId } = await params;
  const tenantId = (session.user as any).tenantId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the order with items and check ownership
      const order = await tx.purchaseOrder.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } }
      });

      if (!order) throw new Error("Bon de commande non trouvé");
      if (order.tenantId !== tenantId) throw new Error("Accès non autorisé à ce bon de commande");
      if (order.status === "RECU") throw new Error("Ce bon de commande a déjà été reçu");

      // 2. Create stock movements and update product stocks
      for (const item of order.items) {
        // Create movement
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            type: "ENTREE_ACHAT",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            userId: (session.user as any).id,
            orderId: order.id,
            reason: `Réception BC ${order.number}`,
            reference: order.number
          }
        });

        // Update product current stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              increment: item.quantity
            }
          }
        });
      }

      // 3. Update order status and supplier balance
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { 
          status: "RECU",
          updatedAt: new Date()
        }
      });

      // Update supplier balance (debt increases upon reception)
      await tx.supplier.update({
        where: { id: order.supplierId },
        data: {
          balance: {
            increment: order.total
          }
        }
      });

      return updatedOrder;
    });

    return NextResponse.json({ data: result, message: "Réception validée et stock mis à jour" });
  } catch (error: any) {
    console.error("Error receiving order:", error);
    return NextResponse.json({ error: error.message || "Erreur lors de la réception" }, { status: 400 });
  }
}
