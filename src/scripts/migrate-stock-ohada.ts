// src/scripts/migrate-stock-ohada.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OHADA_ACCOUNTS = [
  // Classe 1 : Ressources stables
  { code: "101", name: "Capital social", class: 1 },
  // Classe 2 : Actif immobilisé
  { code: "21", name: "Immobilisations incorporelles", class: 2 },
  { code: "22", name: "Terrains", class: 2 },
  { code: "24", name: "Matériel et outillage", class: 2 },
  // Classe 3 : Stocks
  { code: "31", name: "Marchandises", class: 3 },
  // Classe 4 : Tiers
  { code: "401", name: "Fournisseurs", class: 4 },
  { code: "411", name: "Clients", class: 4 },
  { code: "422", name: "Personnel, rémunérations dues", class: 4 },
  { code: "44", name: "État et collectivités publiques", class: 4 },
  // Classe 5 : Financier
  { code: "521", name: "Banques", class: 5 },
  { code: "571", name: "Caisses", class: 5 },
  // Classe 6 : Charges
  { code: "601", name: "Achats de marchandises", class: 6 },
  { code: "602", name: "Achats de matières premières", class: 6 },
  { code: "611", name: "Services extérieurs (Loyer)", class: 6 },
  { code: "616", name: "Transports", class: 6 },
  { code: "63", name: "Impôts et taxes", class: 6 },
  { code: "66", name: "Charges de personnel (Salaires)", class: 6 },
  // Classe 7 : Produits
  { code: "701", name: "Ventes de marchandises", class: 7 },
  { code: "707", name: "Produits accessoires", class: 7 },
  { code: "75", name: "Autres produits", class: 7 }
];

async function run() {
  console.log("🌱 Début de la migration de données multi-entrepôts & OHADA...");

  // 1. Récupérer tous les tenants
  const tenants = await prisma.tenant.findMany();
  console.log(`🔍 Trouvé ${tenants.length} entreprise(s) (tenant(s)) à migrer.`);

  for (const tenant of tenants) {
    console.log(`\n🏢 Migration pour l'entreprise : ${tenant.name} (${tenant.slug})`);

    // --- MIGRATION FINANCES : COMPTES OHADA ---
    console.log("  📊 Initialisation du Plan Comptable OHADA...");
    let ohadaCreatedCount = 0;
    for (const acc of OHADA_ACCOUNTS) {
      const existing = await prisma.ohadaAccount.findUnique({
        where: {
          tenantId_code: {
            tenantId: tenant.id,
            code: acc.code
          }
        }
      });

      if (!existing) {
        await prisma.ohadaAccount.create({
          data: {
            tenantId: tenant.id,
            code: acc.code,
            name: acc.name,
            class: acc.class
          }
        });
        ohadaCreatedCount++;
      }
    }
    console.log(`  ✅ ${ohadaCreatedCount} comptes OHADA initialisés.`);

    // --- MIGRATION STOCKS : ENTREPÔTS PAR DÉFAUT ---
    console.log("  📦 Initialisation des entrepôts (Dépôt Principal & Boutique)...");
    
    // Dépôt Principal
    let mainWarehouse = await prisma.warehouse.findFirst({
      where: { tenantId: tenant.id, isMain: true }
    });
    if (!mainWarehouse) {
      mainWarehouse = await prisma.warehouse.create({
        data: {
          tenantId: tenant.id,
          name: "Dépôt Principal",
          code: "DEP-MAIN",
          description: "Entrepôt principal de stockage des marchandises",
          isMain: true,
          isShop: false
        }
      });
      console.log(`  ✅ Dépôt Principal créé.`);
    }

    // Boutique
    let shopWarehouse = await prisma.warehouse.findFirst({
      where: { tenantId: tenant.id, isShop: true }
    });
    if (!shopWarehouse) {
      shopWarehouse = await prisma.warehouse.create({
        data: {
          tenantId: tenant.id,
          name: "Boutique",
          code: "BOUTIQUE-01",
          description: "Showroom et point de vente directe",
          isMain: false,
          isShop: true
        }
      });
      console.log(`  ✅ Boutique créée.`);
    }

    // --- LIER LES STOCKS ACTUELS AU DÉPÔT PRINCIPAL ---
    console.log("  🔄 Migration des stocks actuels des produits vers le Dépôt Principal...");
    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id }
    });

    let stockMigratedCount = 0;
    for (const prod of products) {
      const existingStock = await prisma.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: mainWarehouse.id,
            productId: prod.id
          }
        }
      });

      if (!existingStock) {
        await prisma.warehouseStock.create({
          data: {
            tenantId: tenant.id,
            warehouseId: mainWarehouse.id,
            productId: prod.id,
            quantity: prod.currentStock,
            minStock: prod.minStock,
            maxStock: prod.maxStock
          }
        });

        // Initialiser la boutique avec un stock de 0
        await prisma.warehouseStock.create({
          data: {
            tenantId: tenant.id,
            warehouseId: shopWarehouse.id,
            productId: prod.id,
            quantity: 0,
            minStock: Math.round(prod.minStock * 0.2), // boutique seuil bas par défaut
            maxStock: Math.round(prod.maxStock * 0.5)
          }
        });

        stockMigratedCount++;
      }
    }
    console.log(`  ✅ Stock de ${stockMigratedCount} produits migré vers le Dépôt Principal.`);
  }

  console.log("\n🚀 TOUTES LES MIGRATIONS SE SONT DÉROULÉES AVEC SUCCÈS !");
}

run()
  .catch((err) => {
    console.error("❌ Erreur pendant la migration :", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
