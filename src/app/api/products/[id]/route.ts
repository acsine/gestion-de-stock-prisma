// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validations";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const product = await prisma.product.findUnique({
  where: { id },
    include: { category: true, supplier: true, stockMovements: { take: 10, orderBy: { createdAt: "desc" } } },
  });
  if (!product) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json({ data: product });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  const product = await prisma.product.update({
  where: { id },
    data: body,
    include: { category: true, supplier: true },
  });
  return NextResponse.json({ data: product });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  await prisma.product.update({ where: { id }, data: { status: "ARCHIVE" } });
  return NextResponse.json({ message: "Produit archivé" });
}
