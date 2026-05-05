import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function reset() {
  const email = "admin@stockapigestion.com";
  const password = "Admin@1234";
  
  // Hashage manuel pour être sûr de la correspondance
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  console.log(`Réinitialisation de l'admin : ${email}...`);

  // On cherche l'utilisateur d'abord
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.error("❌ Utilisateur admin non trouvé dans la base de données. Exécutez d'abord le seed.");
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { 
      passwordHash: hashedPassword,
      isActive: true,
      mustChangePassword: false
    }
  });

  console.log("✅ Mot de passe réinitialisé avec succès !");
  console.log(`Email : ${email}`);
  console.log(`Nouveau Mot de passe : ${password}`);
}

reset()
  .catch(e => console.error("Erreur :", e))
  .finally(() => prisma.$disconnect());
