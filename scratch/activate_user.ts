import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function activate() {
  const email = "fomocaleb2@gmail.com";
  console.log(`Activating user ${email} and their tenant in database...`);

  // 1. Find user
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { tenant: true }
  });

  if (!user) {
    console.error("❌ User not found.");
    return;
  }

  // 2. Activate user
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: true }
  });
  console.log("✅ User successfully set to isActive = true");

  // 3. Ensure tenant is active and has a license
  if (user.tenantId) {
    // Let's find a license in the DB
    let license = await prisma.license.findFirst({
      where: { name: { contains: "Pro", mode: "insensitive" } }
    });

    if (!license) {
      license = await prisma.license.findFirst();
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        subscriptionActive: true,
        licenseId: license ? license.id : null,
        trialEndsAt: null
      }
    });

    console.log("✅ Tenant AlphaVision successfully activated!");
    console.log("License Assigned:", license ? license.name : "NONE");
  } else {
    console.log("⚠️ No tenant was associated with this user.");
  }
}

activate()
  .catch(e => console.error("Error activating user:", e))
  .finally(() => prisma.$disconnect());

