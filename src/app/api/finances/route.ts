// src/app/api/finances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations";
import { logActivity } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const accountId = searchParams.get("accountId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 20;

    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

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
  const isSuper = (session.user as any).isSuperAdmin;
  if (!["ADMIN", "COMPTABLE"].includes(role) && !isSuper) return NextResponse.json({ error: "Permission refusée" }, { status: 403 });

  const body = await req.json();
  let tenantId = (session.user as any).tenantId || (isSuper ? body.tenantId : null);
  if (isSuper && !tenantId) {
    const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
    if (firstTenant) {
      tenantId = firstTenant.id;
    }
  }
  if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { type, amount, accountId } = parsed.data;
  const delta = type === "RECETTE" ? amount : -amount;

  // Récupérer les informations du compte financier pour le type de trésorerie (Caisse / Banque)
  const cashAccount = await prisma.cashAccount.findUnique({
    where: { id: accountId }
  });

  // Associer le compte financier de classe 5 standard
  const class5Code = cashAccount?.type === "BANQUE" ? "521" : "571";
  const class5Account = await prisma.ohadaAccount.findFirst({
    where: { tenantId, code: class5Code }
  });

  // Déterminer le compte de charges (Classe 6) ou de produits (Classe 7) en fonction de la catégorie
  let categoryCode = "601"; // par défaut Achat de marchandises
  if (type === "RECETTE") {
    categoryCode = "701"; // par défaut Ventes de marchandises
    if (parsed.data.category === "Prestation de services") categoryCode = "707";
    if (parsed.data.category === "Autre recette") categoryCode = "75";
  } else {
    if (parsed.data.category === "Loyer") categoryCode = "611";
    if (parsed.data.category === "Salaires") categoryCode = "66";
    if (parsed.data.category === "Transport") categoryCode = "616";
    if (parsed.data.category === "Taxes et impôts") categoryCode = "63";
  }

  const categoryAccount = await prisma.ohadaAccount.findFirst({
    where: { tenantId, code: categoryCode }
  });

  // Assigner les rôles de Débit et de Crédit
  let debitAccountId = parsed.data.debitAccountId || null;
  let creditAccountId = parsed.data.creditAccountId || null;

  if (!debitAccountId && !creditAccountId) {
    if (type === "RECETTE") {
      // Recette : Débit Trésorerie (Banque/Caisse) et Crédit Ventes (Classe 7)
      debitAccountId = class5Account?.id || null;
      creditAccountId = categoryAccount?.id || null;
    } else {
      // Dépense : Débit Charges (Classe 6) et Crédit Trésorerie (Banque/Caisse)
      debitAccountId = categoryAccount?.id || null;
      creditAccountId = class5Account?.id || null;
    }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: { 
        ...parsed.data, 
        debitAccountId,
        creditAccountId,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(), 
        userId: (session.user as any).id, 
        tenantId 
      },
      include: { account: true },
    });

    await tx.cashAccount.update({
      where: { id: accountId },
      data: { balance: { increment: delta } },
    });

    // Si c'est une dépense liée à un fournisseur, réduire sa dette
    if (type === "DEPENSE" && parsed.data.supplierId) {
      await tx.supplier.update({
        where: { id: parsed.data.supplierId },
        data: { balance: { decrement: amount } },
      });
    }

    return t;
  });

  await logActivity({
    userId: (session.user as any).id,
    action: "CREATE",
    entity: "Transaction",
    entityId: transaction.id,
    newValue: transaction,
  });

  return NextResponse.json({ data: transaction, message: "Transaction enregistrée" }, { status: 201 });
}
