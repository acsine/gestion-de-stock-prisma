// src/app/api/permissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const permissions = await prisma.permission.findMany({
    orderBy: { code: "asc" }
  });
  
  return NextResponse.json({ data: permissions });
}

// Seed permissions if they don't exist
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const isSuper = (session.user as any).isSuperAdmin;
  const roleName = (session.user as any).role;
  if (!isSuper && roleName !== "ADMIN") return NextResponse.json({ error: "Permission refusée" }, { status: 403 });

  const defaultPermissions = [
    { code: "dashboard.view", name: "Voir le tableau de bord" },
    { code: "products.view", name: "Voir les produits" },
    { code: "products.create", name: "Créer des produits" },
    { code: "products.edit", name: "Modifier des produits" },
    { code: "products.delete", name: "Supprimer des produits" },
    { code: "categories.manage", name: "Gérer les catégories" },
    { code: "stock.view", name: "Voir les mouvements de stock" },
    { code: "stock.manage", name: "Gérer les stocks" },
    { code: "orders.view", name: "Voir les bons de commande" },
    { code: "orders.create", name: "Créer des bons de commande" },
    { code: "orders.edit", name: "Modifier des bons de commande" },
    { code: "orders.delete", name: "Supprimer des bons de commande" },
    { code: "orders.receive", name: "Valider la réception (Encaisser)" },
    { code: "pos.access", name: "Accès Session Commercial (POS)" },
    { code: "invoices.view", name: "Voir les factures" },
    { code: "invoices.create", name: "Créer des factures" },
    { code: "clients.view", name: "Voir les clients" },
    { code: "clients.manage", name: "Gérer les clients" },
    { code: "suppliers.view", name: "Voir les fournisseurs" },
    { code: "suppliers.create", name: "Créer des fournisseurs" },
    { code: "suppliers.edit", name: "Modifier des fournisseurs" },
    { code: "suppliers.delete", name: "Supprimer des fournisseurs" },
    { code: "finances.view", name: "Voir les finances" },
    { code: "finances.manage", name: "Gérer les transactions" },
    { code: "employees.view", name: "Voir les employés" },
    { code: "employees.manage", name: "Gérer les employés" },
    { code: "users.manage", name: "Gérer les utilisateurs et rôles" },
    { code: "settings.manage", name: "Gérer les paramètres" },
    { code: "rapports.view", name: "Voir les rapports" },
  ];

  try {
    for (const p of defaultPermissions) {
      await prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name },
        create: { code: p.code, name: p.name }
      });
    }
    return NextResponse.json({ message: "Permissions initialisées" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de l'initialisation" }, { status: 500 });
  }
}
