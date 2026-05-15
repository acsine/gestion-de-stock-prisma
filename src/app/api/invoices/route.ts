// src/app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validations";

async function generateInvoiceNumber(tenantId: string, type: string): Promise<string> {
  const prefixMap: Record<string, string> = { FACTURE: "FAC", PROFORMA: "PRO", AVOIR: "AVO", DEVIS: "DEV" };
  const prefix = prefixMap[type] || "FAC";
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ 
    where: { tenantId, type: type as any, number: { startsWith: `${prefix}-${year}` } } 
  });
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
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
    if (search) where.OR = [
      { number: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
    if (status) where.status = status;
    if (type) where.type = type;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, unit: true } } } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({ data: invoices, total, page, pageSize });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;

    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

    const body = await req.json();
    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { type, customerId, discount, dueDate, notes, items } = parsed.data;

    // Calculate totals
    let subtotalRaw = 0;
    let taxAmountRaw = 0;
    const processedItems = items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      const lineTax = lineTotal * ((item.taxRate || 19.25) / 100);
      subtotalRaw += lineTotal;
      taxAmountRaw += lineTax;
      return { ...item, total: lineTotal };
    });

    const subtotal = subtotalRaw * (1 - discount / 100);
    const taxAmount = taxAmountRaw * (1 - discount / 100);
    const total = subtotal + taxAmount;
    const number = await generateInvoiceNumber(tenantId, type);

    // Check stock availability for sales
    if (type === "FACTURE") {
      for (const item of items) {
        const product = await prisma.product.findFirst({ 
          where: { id: item.productId, tenantId } 
        });
        if (!product) continue;
        if (product.currentStock < item.quantity) {
          return NextResponse.json({
            error: `Stock insuffisant pour "${product.name}". Disponible: ${product.currentStock}`,
          }, { status: 400 });
        }
      }
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId,
          number,
          type: type as any,
          status: "BROUILLON",
          customerId,
          userId: (session.user as any).id,
          discount,
          subtotal,
          taxAmount,
          total,
          paidAmount: 0,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes,
          items: {
            create: processedItems.map((item) => ({
              tenantId,
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              discount: item.discount || 0,
              total: item.total,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      // Decrement stock for FACTURE
      if (type === "FACTURE") {
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
            },
          });
        }
      }

      return inv;
    });

    return NextResponse.json({ data: invoice, message: "Facture créée" }, { status: 201 });
  } catch (error: any) {
    console.error("[API_INVOICES_POST]", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
