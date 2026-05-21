// scratch/seed_permissions.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  console.log("🌱 Démarrage du peuplement des 29 permissions dans la base...");
  for (const p of defaultPermissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name },
      create: { code: p.code, name: p.name },
    });
  }
  console.log("✅ Les 29 permissions ont été peuplées avec succès !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le peuplement :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
