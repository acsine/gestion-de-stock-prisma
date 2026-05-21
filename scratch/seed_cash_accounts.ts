import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log(`Found ${tenants.length} tenants in the database.`);

  for (const t of tenants) {
    console.log(`Seeding cash accounts for tenant: ${t.name} (${t.slug})`);

    // 1. Caisse Principale (Espèces)
    const caisseId = `caisse-esp-${t.slug}`;
    await prisma.cashAccount.upsert({
      where: { id: caisseId },
      update: { isActive: true },
      create: {
        id: caisseId,
        tenantId: t.id,
        name: t.slug === "fomoc" ? "Caisse FomoC" : "Caisse Principale (Espèces)",
        type: "CAISSE",
        balance: 100000.0, // Initial balance
        currency: "XAF",
        isActive: true,
      },
    });

    // 2. Mobile Money
    const momoId = `caisse-momo-${t.slug}`;
    await prisma.cashAccount.upsert({
      where: { id: momoId },
      update: { isActive: true },
      create: {
        id: momoId,
        tenantId: t.id,
        name: "Mobile Money (MTN/Orange)",
        type: "MOBILE_MONEY",
        balance: 50000.0,
        currency: "XAF",
        isActive: true,
      },
    });

    // 3. Banque
    const banqueId = `caisse-banque-${t.slug}`;
    await prisma.cashAccount.upsert({
      where: { id: banqueId },
      update: { isActive: true },
      create: {
        id: banqueId,
        tenantId: t.id,
        name: "Compte Bancaire",
        type: "BANQUE",
        balance: 250000.0,
        currency: "XAF",
        isActive: true,
      },
    });
  }

  console.log("Seeded cash accounts successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
