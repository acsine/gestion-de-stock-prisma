import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function activate() {
  const email = "fomocaleb2@gmail.com";
  console.log(`Activating user ${email} in CLOUD database...`);

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } }
  });

  if (!user) {
    console.error("❌ User not found.");
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: true }
  });

  console.log("✅ User successfully activated!");
  console.log(JSON.stringify({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    isActive: updated.isActive
  }, null, 2));
}

activate()
  .catch(e => console.error("Error activating user:", e))
  .finally(() => prisma.$disconnect());
