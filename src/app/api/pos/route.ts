import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    let tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const body = await req.json();
    const { items, customerId, accountId, paymentMethod, globalDiscount, targetTenantId } = body;

    // If superadmin, allow specifying target tenant or derive from account
    if (isSuper) {
      if (targetTenantId) {
        tenantId = targetTenantId;
      } else if (accountId) {
        const acc = await prisma.cashAccount.findUnique({ where: { id: accountId } });
        if (acc) tenantId = acc.tenantId;
      }
    }

    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "Compte financier requis" }, { status: 400 });
    }

    // Verify stock and ownership first
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.tenantId !== tenantId) {
        return NextResponse.json({ error: "Produit non trouvé ou non autorisé" }, { status: 404 });
      }
      if (product.currentStock < item.quantity) {
        return NextResponse.json({
          error: `Stock insuffisant pour "${product.name}". Disponible: ${product.currentStock}`,
        }, { status: 400 });
      }
    }

    // Generate invoice number
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({ 
      where: { tenantId, type: "FACTURE", number: { startsWith: `FAC-${year}` } } 
    });
    const number = `FAC-${year}-${String(count + 1).padStart(4, "0")}`;

    // Compute totals
    let subtotalRaw = 0;
    let taxAmountRaw = 0;
    const processedItems = items.map((item: any) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      const lineTax = lineTotal * ((item.taxRate || 19.25) / 100);
      subtotalRaw += lineTotal;
      taxAmountRaw += lineTax;
      return { ...item, total: lineTotal };
    });

    const discountValue = globalDiscount || 0;
    const subtotal = subtotalRaw * (1 - discountValue / 100);
    const taxAmount = taxAmountRaw * (1 - discountValue / 100);
    const total = subtotal + taxAmount;

    // Use a default customer if none provided
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      // Find or create default "Client Divers"
      let defaultCustomer = await prisma.customer.findFirst({ where: { name: "Client Divers", tenantId } });
      if (!defaultCustomer) {
        defaultCustomer = await prisma.customer.create({
          data: { name: "Client Divers", type: "PARTICULIER", tenantId }
        });
      }
      finalCustomerId = defaultCustomer.id;
    }

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Invoice
      const inv = await tx.invoice.create({
        data: {
          tenantId,
          number,
          type: "FACTURE",
          status: "PAYE",
          customerId: finalCustomerId,
          userId: (session.user as any).id,
          discount: discountValue,
          subtotal,
          taxAmount,
          total,
          paidAmount: total,
          issueDate: new Date(),
          items: {
            create: processedItems.map((item: any) => ({
              tenantId,
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate || 19.25,
              discount: item.discount || 0,
              total: item.total,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          user: true,
        },
      });

      // 2. Decrement Stock & Create Stock Movements
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            type: "SORTIE_VENTE",
            quantity: item.quantity,
            reference: number,
            unitPrice: item.unitPrice,
            userId: (session.user as any).id,
            invoiceId: inv.id,
            note: "Vente au comptoir (Caisse)",
          },
        });
      }

      // 3. Register Payment
      await tx.payment.create({
        data: {
          tenantId,
          invoiceId: inv.id,
          amount: total,
          method: paymentMethod || "ESPECES",
        },
      });

      // 4. Create Transaction & Update Cash Account
      await tx.transaction.create({
        data: {
          tenantId,
          type: "RECETTE",
          amount: total,
          category: "Ventes produits",
          accountId: accountId,
          reference: number,
          description: `Vente au comptoir - Facture ${number}`,
          userId: (session.user as any).id,
        },
      });

      await tx.cashAccount.update({
        where: { id: accountId },
        data: { balance: { increment: total } },
      });

      return inv;
    });

    await logActivity({
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "Invoice",
      entityId: result.id,
      newValue: {
        number: result.number,
        total: result.total,
        paymentMethod: paymentMethod || "ESPECES",
        accountId: accountId,
      },
    });

    return NextResponse.json({ data: result, message: "Vente enregistrée avec succès" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
