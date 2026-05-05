// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage du seed...");

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Administrateur complet" },
  });

  await prisma.role.upsert({
    where: { name: "VENDEUR" },
    update: {},
    create: { name: "VENDEUR", description: "Vendeur / Caissier" },
  });

  // Admin user
  const hashedPassword = await bcrypt.hash("Admin@1234", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@stockapigestion.com" },
    update: {},
    create: {
      name: "Administrateur",
      email: "admin@stockapigestion.com",
      passwordHash: hashedPassword,
      roleId: adminRole.id,
      mustChangePassword: false,
    },
  });

  // Default settings
  const settings = [
    { key: "company_name", value: "Sachand Stock Manager", group: "company" },
    { key: "company_address", value: "Yaoundé, Cameroun", group: "company" },
    { key: "company_phone", value: "+237 000 000 000", group: "company" },
    { key: "company_email", value: "contact@sachand.cm", group: "company" },
    { key: "company_currency", value: "XAF", group: "company" },
    { key: "invoice_prefix", value: "FAC", group: "invoice" },
    { key: "order_prefix", value: "BC", group: "invoice" },
    { key: "default_tax_rate", value: "19.25", group: "finance" },
    { key: "low_stock_buffer", value: "20", group: "stock" },
    { key: "social_charges_rate", value: "17.5", group: "hr" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  // Default cash account
  await prisma.cashAccount.upsert({
    where: { id: "main-caisse" },
    update: {},
    create: {
      id: "main-caisse",
      name: "Caisse Principale",
      type: "CAISSE",
      balance: 0,
      currency: "XAF",
    },
  });

  // Sample categories
  const cat1 = await prisma.category.upsert({
    where: { slug: "electronique" },
    update: {},
    create: { name: "Électronique", slug: "electronique", color: "#3B82F6", icon: "Cpu" },
  });
  const cat2 = await prisma.category.upsert({
    where: { slug: "alimentaire" },
    update: {},
    create: { name: "Alimentaire", slug: "alimentaire", color: "#10B981", icon: "ShoppingBasket" },
  });
  const cat3 = await prisma.category.upsert({
    where: { slug: "papeterie" },
    update: {},
    create: { name: "Papeterie", slug: "papeterie", color: "#F59E0B", icon: "BookOpen" },
  });

  // Sample supplier
  const supplier = await prisma.supplier.upsert({
    where: { id: "sample-supplier" },
    update: {},
    create: {
      id: "sample-supplier",
      name: "CAMFOOD SARL",
      contactName: "Jean Mbarga",
      phone: "+237 677 000 001",
      email: "contact@camfood.cm",
      city: "Douala",
      balance: 0,
    },
  });

  // Sample products
  const products = [
    { sku: "ELEC-001", name: "Ordinateur Portable HP", categoryId: cat1.id, buyPrice: 250000, sellPrice: 320000, minStock: 2, maxStock: 20, currentStock: 8 },
    { sku: "ELEC-002", name: "Imprimante Canon", categoryId: cat1.id, buyPrice: 85000, sellPrice: 110000, minStock: 1, maxStock: 10, currentStock: 3 },
    { sku: "ALIM-001", name: "Riz Local 50kg", categoryId: cat2.id, buyPrice: 15000, sellPrice: 18000, minStock: 10, maxStock: 200, currentStock: 45, unit: "Sac" },
    { sku: "ALIM-002", name: "Huile de palme 20L", categoryId: cat2.id, buyPrice: 12000, sellPrice: 15000, minStock: 5, maxStock: 100, currentStock: 2, unit: "Bidon" },
    { sku: "PAP-001", name: "Rame de papier A4", categoryId: cat3.id, buyPrice: 3500, sellPrice: 5000, minStock: 10, maxStock: 500, currentStock: 12, unit: "Rame" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, supplierId: supplier.id },
    });
  }

  // Sample customer
  await prisma.customer.upsert({
    where: { id: "sample-customer" },
    update: {},
    create: {
      id: "sample-customer",
      name: "Client Comptoir",
      type: "PARTICULIER",
      phone: "+237 677 000 002",
    },
  });

  console.log("✅ Seed terminé !");
  console.log(`👤 Admin: admin@stockapigestion.com / Admin@1234`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
