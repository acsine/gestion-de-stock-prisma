import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json({ data: customer });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = customerSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const customer = await prisma.customer.update({ where: { id }, data: parsed.data as any });
  return NextResponse.json({ data: customer, message: "Client mis à jour" });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  
  // Check if customer has invoices or orders before deleting
  const invoicesCount = await prisma.invoice.count({ where: { customerId: id } });
  if (invoicesCount > 0) {
    return NextResponse.json({ error: "Impossible de supprimer un client ayant des factures" }, { status: 400 });
  }

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ message: "Client supprimé" });
}
