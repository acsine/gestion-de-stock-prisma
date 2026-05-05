// src/app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, user: { select: { name: true } }, items: { include: { product: true } }, payments: true },
  });
  if (!invoice) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json({ data: invoice });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  const invoice = await prisma.invoice.update({ where: { id }, data: body });
  return NextResponse.json({ data: invoice });
}
