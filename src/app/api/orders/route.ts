// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { purchaseOrderSchema } from "@/lib/validations";

async function generateOrderNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({ 
    where: { tenantId, number: { startsWith: `BC-${year}` } } 
  });
  return `BC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  
  const where: any = {};
  if (!isSuper) {
    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
    where.tenantId = tenantId;
  } else if (tenantId) {
    where.tenantId = tenantId;
  }

  if (status) where.status = status;
  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: { include: { product: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);
  return NextResponse.json({ data: orders, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

  const body = await req.json();
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

  const number = await generateOrderNumber(tenantId);
  const order = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      number, supplierId, notes,
      expectedAt: expectedAt ? new Date(expectedAt) : undefined,
      subtotal, taxAmount, total: subtotal + taxAmount,
      userId: (session.user as any).id,
      status: "BROUILLON",
      items: {
        create: processedItems.map((i) => ({
          tenantId,
          productId: i.productId, quantity: i.quantity, receivedQty: 0,
          unitPrice: i.unitPrice, taxRate: i.taxRate, total: i.total,
        })),
      },
    },
    include: { supplier: true, items: { include: { product: true } } },
  });
  return NextResponse.json({ data: order, message: "Bon de commande créé" }, { status: 201 });
}
