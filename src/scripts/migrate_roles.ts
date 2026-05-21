// src/scripts/migrate_roles.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration...");

  // 1. Create Default Permissions
  const permissions = [
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

  console.log("Seeding permissions...");
  for (const p of permissions) {
    await (prisma as any).permission.upsert({
      where: { code: p.code },
      update: { name: p.name },
      create: { code: p.code, name: p.name }
    });
  }

  const allPerms = await (prisma as any).permission.findMany();
  const permsMap = Object.fromEntries(allPerms.map((p: any) => [p.code, p.id]));

  // 2. Create Roles
  const roles = [
    { name: "ADMIN", description: "Administrateur système (Accès total)", perms: allPerms.map((p: any) => p.id) },
    { 
      name: "VENDEUR", 
      description: "Vendeur / Caissier", 
      perms: [
        permsMap["pos.access"], 
        permsMap["invoices.view"], 
        permsMap["invoices.create"], 
        permsMap["clients.view"] || "ALL",
        permsMap["orders.view"],
        permsMap["orders.create"],
        permsMap["dashboard.view"]
      ] 
    },
    { 
      name: "GESTIONNAIRE_STOCK", 
      description: "Gestionnaire de stock", 
      perms: [permsMap["products.view"], permsMap["products.create"], permsMap["products.edit"], permsMap["categories.manage"], permsMap["stock.view"], permsMap["stock.manage"], permsMap["orders.view"], permsMap["orders.create"], permsMap["orders.receive"], permsMap["dashboard.view"]] 
    },
    { 
      name: "COMPTABLE", 
      description: "Comptable", 
      perms: [permsMap["finances.view"], permsMap["finances.manage"], permsMap["invoices.view"], permsMap["orders.view"], permsMap["rapports.view"], permsMap["dashboard.view"]] 
    },
    { 
      name: "RH", 
      description: "Ressources Humaines", 
      perms: [permsMap["employees.view"], permsMap["employees.manage"], permsMap["dashboard.view"]] 
    },
  ];

  console.log("Creating roles...");
  for (const r of roles) {
    await (prisma as any).role.upsert({
      where: { name: r.name },
      update: { 
        description: r.description,
        permissions: { set: r.perms.filter(Boolean).map((id: string) => ({ id })) }
      },
      create: { 
        name: r.name, 
        description: r.description,
        permissions: { connect: r.perms.filter(Boolean).map((id: string) => ({ id })) }
      }
    });
  }

  // 3. Migrate Users
  console.log("Migrating users...");
  const users = await prisma.user.findMany();
  const dbRoles = await (prisma as any).role.findMany();
  const rolesByName = Object.fromEntries(dbRoles.map((r: any) => [r.name, r.id]));

  for (const user of users) {
    const roleId = rolesByName[(user as any).role as string] || rolesByName["VENDEUR"];
    await prisma.user.update({
      where: { id: user.id },
      data: { roleId }
    });
  }

  console.log("Migration finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
