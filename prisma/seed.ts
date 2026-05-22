// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage de l'initialisation système ThaborSolution...");

  // 1. LICENCES
  console.log("📝 Configuration des licences...");
  const licenses = [
    { id: "cmpcx409e0000h8cwiorm59cx", name: "GRATUIT", price: 0, durationDays: 1, maxUsers: 2, maxProducts: 50, canDownload: false },
    { id: "cmpcx40nd0001h8cwygodxnza", name: "PROFESSIONNEL", price: 50000, durationDays: 365, maxUsers: 10, maxProducts: 5000, canDownload: true },
    { id: "cmpcx40ud0002h8cwepjvs0do", name: "ENTREPRISE", price: 150000, durationDays: 365, maxUsers: 100, maxProducts: null, canDownload: true },
  ];

  for (const l of licenses) {
    await prisma.license.upsert({
      where: { id: l.id },
      update: { ...l },
      create: { ...l },
    });
  }

  // 2. SUPER ADMINISTRATEUR (Gestionnaire global ThaborSolution)
  const superAdminPassword = await bcrypt.hash("SuperAdmin@2026", 12);
  await prisma.user.upsert({
    where: { email: "superadmin@thaborsolution.com" },
    update: {},
    create: {
      id: "cmpcx41sd0003h8cwd8t9bhwu",
      name: "Super Administrateur ThaborSolution",
      email: "superadmin@thaborsolution.com",
      passwordHash: superAdminPassword,
      isSuperAdmin: true,
      isActive: true,
      mustChangePassword: false,
    },
  });

  // 3. PREMIER CLIENT MARCHAND (Default Tenant)
  console.log("🏢 Création du premier tenant marchand...");
  const tenantId = "cmpcx43ab0005h8cwmb54vjgf";
  const tenant = await prisma.tenant.upsert({
    where: { slug: "thabor-merchant" },
    update: { licenseId: "cmpcx409e0000h8cwiorm59cx" },
    create: {
      id: tenantId,
      name: "Thabor Merchant Demo",
      slug: "thabor-merchant",
      email: "marchand@thaborsolution.com",
      status: "ACTIVE",
      licenseId: "cmpcx409e0000h8cwiorm59cx",
      trialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });

  // 4. RÔLES DU MARCHAND
  const adminRoleId = "cmpcx43p30007h8cw1yqkjxk3";
  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: "ADMIN" } },
    update: {},
    create: { 
      id: adminRoleId,
      name: "ADMIN", 
      tenantId,
      description: "Administrateur complet du magasin" 
    },
  });

  // 5. COMPTE MARCHAND
  const merchantPassword = await bcrypt.hash("Merchant@123", 12);
  
  // Seed direct user if provided, otherwise default demo user
  const syncEmail = process.env.SYNC_EMAIL;
  if (syncEmail) {
    await prisma.user.upsert({
      where: { email: syncEmail },
      update: {},
      create: {
        id: "cmpcx45b30009h8cwiffxi4lp_sync",
        name: syncEmail.split('@')[0],
        email: syncEmail,
        passwordHash: merchantPassword,
        tenantId,
        roleId: adminRoleId,
        isActive: true,
        mustChangePassword: false,
      },
    });
  } else {
    await prisma.user.upsert({
      where: { email: "marchand@thaborsolution.com" },
      update: {},
      create: {
        id: "cmpcx45b30009h8cwiffxi4lp",
        name: "Directeur Marchand",
        email: "marchand@thaborsolution.com",
        passwordHash: merchantPassword,
        tenantId,
        roleId: adminRoleId,
        isActive: true,
        mustChangePassword: false,
      },
    });
  }

  // 6. PARAMÈTRES PAR DÉFAUT DU MARCHAND
  const settings = [
    { key: "company_name", value: "Thabor Solution Demo", group: "company" },
    { key: "company_currency", value: "XAF", group: "company" },
    { key: "default_tax_rate", value: "19.25", group: "finance" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: s.key } },
      update: {},
      create: { ...s, tenantId },
    });
  }

  if (process.env.SILENT_SEED === "true") {
    console.log("\n✅ INITIALISATION DES STRUCTURES RÉUSSIE !");
  } else {
    console.log("\n✅ INITIALISATION RÉUSSIE !");
    console.log("--------------------------------------------------");
    console.log("👤 SUPER ADMIN : superadmin@thaborsolution.com / SuperAdmin@2026");
    console.log("🏢 SLUG        : thabor-merchant");
    console.log("--------------------------------------------------\n");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
