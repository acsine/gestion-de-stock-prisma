// src/app/api/alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;

  const where: any = { isRead: false };
  if (!isSuper) {
    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
    where.tenantId = tenantId;
  } else if (tenantId) {
    where.tenantId = tenantId;
  }

  const alerts = await prisma.alert.findMany({
    where,
    include: { product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: alerts });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await req.json();
  await prisma.alert.update({ where: { id }, data: { isRead: true } });
  return NextResponse.json({ message: "Alerte marquée lue" });
}
