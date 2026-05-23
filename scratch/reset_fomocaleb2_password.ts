import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = "fomocaleb2@gmail.com";
const password = "Merchant@123";

async function main() {
  console.log(`🔑 Réinitialisation du mot de passe de ${email}...`);

  // 1. Rechercher l'utilisateur ciblé dans la DB locale
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.error(`\n❌ L'utilisateur ${email} n'existe pas localement.`);
    process.exit(1);
  }

  // 2. Hasher le mot de passe
  const passwordHash = await bcrypt.hash(password, 12);

  // 3. Mettre à jour l'utilisateur
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      isActive: true,
      mustChangePassword: false
    }
  });

  console.log(`\n✅ Mot de passe réinitialisé avec succès !`);
  console.log(`👤 Utilisateur : ${email}`);
  console.log(`🔑 Mot de passe : ${password}`);
  console.log(`✨ Vous pouvez maintenant vous connecter en local avec ces identifiants.`);
}

main()
  .catch((e) => {
    console.error("❌ Une erreur est survenue :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
