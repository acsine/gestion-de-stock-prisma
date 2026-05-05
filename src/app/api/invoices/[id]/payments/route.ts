// src/app/api/invoices/[id]/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { amount, method, reference } = await req.json();
  if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });

  const newPaidAmount = invoice.paidAmount + amount;
  const newStatus = newPaidAmount >= invoice.total ? "PAYE" : "PARTIELLEMENT_PAYE";

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: { invoiceId: id, amount, method: method || "ESPECES", reference },
    }),
    prisma.invoice.update({
      where: { id },
      data: { paidAmount: newPaidAmount, status: newStatus },
    }),
  ]);

  return NextResponse.json({ data: payment, message: "Paiement enregistré" }, { status: 201 });
}
