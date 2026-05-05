// src/scripts/install.ts
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const TOTAL_STEPS = 5;
let currentStep = 0;

function printProgress(message: string) {
  currentStep++;
  const percentage = Math.round((currentStep / TOTAL_STEPS) * 100);
  const barLength = 30;
  const filledLength = Math.round((barLength * currentStep) / TOTAL_STEPS);
  const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);
  
  process.stdout.write(`\r[${bar}] ${percentage}% | ${message}...`);
}

async function run() {
  console.log("\n🚀 INITIALISATION DE SACHAND STOCK MANAGER\n");
  console.log("--------------------------------------------");

  try {
    // Step 1: Check Environment
    printProgress("Vérification de l'environnement");
    if (!fs.existsSync(".env")) {
      fs.copyFileSync(".env.example", ".env");
    }
    await new Promise(r => setTimeout(r, 800));

    // Step 2: Generate Prisma Client
    printProgress("Génération du client de base de données");
    execSync("npx prisma generate", { stdio: "ignore" });
    await new Promise(r => setTimeout(r, 800));

    // Step 3: Sync Database Schema
    printProgress("Synchronisation de la base de données");
    execSync("npx prisma db push --accept-data-loss", { stdio: "ignore" });
    await new Promise(r => setTimeout(r, 800));

    // Step 4: Migrate Roles & Permissions
    printProgress("Configuration des rôles et accès");
    execSync("npx tsx src/scripts/migrate_roles.ts", { stdio: "ignore" });
    await new Promise(r => setTimeout(r, 800));

    // Step 5: Finalizing Admin Account
    printProgress("Finalisation du compte administrateur");
    execSync("npx tsx src/scripts/fix_admin.ts", { stdio: "ignore" });
    execSync("npx tsx src/scripts/reset_admin.ts", { stdio: "ignore" });
    await new Promise(r => setTimeout(r, 800));

    process.stdout.write(`\r[${"█".repeat(30)}] 100% | Installation terminée !\n\n`);

    console.log("====================================================");
    console.log("✅ INSTALLATION RÉUSSIE !");
    console.log("====================================================\n");
    console.log("👤 IDENTIFIANTS ADMINISTRATEUR :");
    console.log("   📧 Email : admin@stockapigestion.com");
    console.log("   🔑 Mot de passe : Admin@123\n");
    console.log("🌐 ACCÈS À L'APPLICATION :");
    console.log("   💻 Local : http://localhost:3000");
    console.log("   📱 Réseau : http://192.168.1.212:3000 (Pour scanner avec mobile)\n");
    console.log("💡 INSTRUCTIONS D'UTILISATION :");
    console.log("   1. Connectez-vous avec le compte admin ci-dessus.");
    console.log("   2. Allez dans 'Utilisateurs' pour créer vos employés.");
    console.log("   3. Attribuez-leur des rôles (Caissier, Gest. Stock, etc.).");
    console.log("   4. Commencez par créer vos Catégories puis vos Produits.");
    console.log("   5. Utilisez le bouton 'Caisse' pour vos premières ventes.\n");
    console.log("🚀 Pour lancer l'application en mode développement :");
    console.log("   Tapez : npm run dev\n");
    console.log("====================================================");

  } catch (error) {
    console.error("\n\n❌ ERREUR LORS DE L'INSTALLATION :");
    console.error(error);
    console.log("\nConseil : Assurez-vous que le serveur (npm run dev) est arrêté avant de lancer ce script.");
  }
}

run();
