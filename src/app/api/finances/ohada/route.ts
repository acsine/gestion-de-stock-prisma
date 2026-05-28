// src/app/api/finances/ohada/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const cls = searchParams.get("class");

    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    if (cls) {
      where.class = parseInt(cls, 10);
    }

    // Récupérer les comptes OHADA avec leurs transactions associées
    const accounts = await prisma.ohadaAccount.findMany({
      where,
      include: {
        debitTransactions: {
          select: { amount: true }
        },
        creditTransactions: {
          select: { amount: true }
        }
      },
      orderBy: { code: "asc" }
    });

    // Calculer les totaux de débit, crédit et solde pour chaque compte
    const processedAccounts = accounts.map((acc) => {
      const totalDebit = acc.debitTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalCredit = acc.creditTransactions.reduce((sum, t) => sum + t.amount, 0);

      // En OHADA, les classes d'actif (2, 3, 5) et de charges (6) ont un solde débiteur par défaut (Débit - Crédit)
      // Les classes de passif (1, 4), de produits (7) ont un solde créditeur par défaut (Crédit - Débit)
      const isDebiteurParDefaut = [2, 3, 5, 6].includes(acc.class);
      const solde = isDebiteurParDefaut 
        ? (totalDebit - totalCredit) 
        : (totalCredit - totalDebit);

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        class: acc.class,
        totalDebit,
        totalCredit,
        solde,
        soldeType: solde >= 0 
          ? (isDebiteurParDefaut ? "DEBITEUR" : "CREDITEUR") 
          : (isDebiteurParDefaut ? "CREDITEUR" : "DEBITEUR"),
        absoluteSolde: Math.abs(solde)
      };
    });

    return NextResponse.json({ data: processedAccounts });
  } catch (error: any) {
    console.error("[API_OHADA_GET]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const isSuper = (session.user as any).isSuperAdmin;
    const role = (session.user as any).role;

    if (!["ADMIN", "COMPTABLE"].includes(role) && !isSuper) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const tenantId = (session.user as any).tenantId;
    const body = await req.json();
    const { code, name } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Le code et l'intitulé du compte sont requis" }, { status: 400 });
    }

    // Déterminer la classe à partir du premier chiffre du code (ex: "5711" -> classe 5)
    const firstDigit = parseInt(code.charAt(0), 10);
    if (isNaN(firstDigit) || firstDigit < 1 || firstDigit > 9) {
      return NextResponse.json({ error: "Code de compte invalide. Il doit commencer par un chiffre entre 1 et 9" }, { status: 400 });
    }

    let finalTenantId = tenantId || (isSuper ? body.tenantId : null);
    if (!finalTenantId) {
      return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
    }

    // Vérifier l'unicité
    const existing = await prisma.ohadaAccount.findUnique({
      where: {
        tenantId_code: {
          tenantId: finalTenantId,
          code: code.trim()
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: `Le compte avec le code ${code} existe déjà.` }, { status: 400 });
    }

    const newAccount = await prisma.ohadaAccount.create({
      data: {
        tenantId: finalTenantId,
        code: code.trim(),
        name: name.trim(),
        class: firstDigit
      }
    });

    await logActivity({
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "OhadaAccount",
      entityId: newAccount.id,
      newValue: newAccount
    });

    return NextResponse.json({ data: newAccount, message: "Compte OHADA créé avec succès" }, { status: 201 });
  } catch (error: any) {
    console.error("[API_OHADA_POST]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
