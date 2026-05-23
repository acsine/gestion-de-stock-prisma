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

  if (process.env.SILENT_SEED === "true") {
    console.log("\n✅ INITIALISATION DES STRUCTURES RÉUSSIE !");
  } else {
    console.log("\n✅ INITIALISATION RÉUSSIE !");
    console.log("--------------------------------------------------");
    console.log("👤 SUPER ADMIN : superadmin@thaborsolution.com / SuperAdmin@2026");
    console.log("--------------------------------------------------\n");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
