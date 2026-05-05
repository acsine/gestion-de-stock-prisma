// src/app/api/finances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const accountId = searchParams.get("accountId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 20;

  const where: any = {};
  if (type) where.type = type;
  if (accountId) where.accountId = accountId;
  if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { account: true, user: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  // Summary stats
  const [recettes, depenses] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...where, type: "RECETTE" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...where, type: "DEPENSE" }, _sum: { amount: true } }),
  ]);

  return NextResponse.json({
    data: transactions,
    total,
    page,
    pageSize,
    summary: {
      totalRecettes: recettes._sum.amount || 0,
      totalDepenses: depenses._sum.amount || 0,
      solde: (recettes._sum.amount || 0) - (depenses._sum.amount || 0),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "COMPTABLE"].includes(role)) return NextResponse.json({ error: "Permission refusée" }, { status: 403 });

  const body = await req.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { type, amount, accountId } = parsed.data;
  const delta = type === "RECETTE" ? amount : -amount;

  const transaction = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: { ...parsed.data, date: parsed.data.date ? new Date(parsed.data.date) : new Date(), userId: (session.user as any).id },
      include: { account: true },
    });

    await tx.cashAccount.update({
      where: { id: accountId },
      data: { balance: { increment: delta } },
    });

    // If it's an expense linked to a supplier, reduce their balance (debt)
    if (type === "DEPENSE" && parsed.data.supplierId) {
      await tx.supplier.update({
        where: { id: parsed.data.supplierId },
        data: { balance: { decrement: amount } },
      });
    }

    return t;
  });

  return NextResponse.json({ data: transaction, message: "Transaction enregistrée" }, { status: 201 });
}
