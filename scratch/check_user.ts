import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const email = "fomocaleb2@gmail.com";
  console.log(`Checking user in CLOUD database: ${email}...`);

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: {
      tenant: {
        include: {
          license: true
        }
      }
    }
  });

  if (!user) {
    console.error("❌ User not found in database.");
    return;
  }

  console.log("\n================ USER DATA ================");
  console.log(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    isSuperAdmin: user.isSuperAdmin,
    tenantId: user.tenantId
  }, null, 2));

  console.log("\n================ TENANT DATA ================");
  if (user.tenant) {
    console.log(JSON.stringify({
      id: user.tenant.id,
      name: user.tenant.name,
      slug: user.tenant.slug,
      subscriptionActive: user.tenant.subscriptionActive,
      trialEndsAt: user.tenant.trialEndsAt,
      licenseId: user.tenant.licenseId,
      licenseName: user.tenant.license?.name || "NONE",
      canDownload: user.tenant.license?.canDownload || false
    }, null, 2));
  } else {
    console.log("No tenant associated with this user.");
  }

  const now = new Date();
  const isTrial = !user.tenant?.licenseId || user.tenant?.license?.name === "GRATUIT";
  let isBlocked = false;
  let blockReason = "";

  if (!user.isSuperAdmin) {
    if (!user.isActive) {
      isBlocked = true;
      blockReason = "USER_INACTIVE";
    } else if (user.tenant) {
      if (isTrial && user.tenant.trialEndsAt && now > user.tenant.trialEndsAt) {
        isBlocked = true;
        blockReason = "TRIAL_EXPIRED (Trial ended at " + user.tenant.trialEndsAt + ", current time is " + now.toISOString() + ")";
      } else if (!user.tenant.subscriptionActive) {
        isBlocked = true;
        blockReason = "SUSPENDED";
      }
    } else {
      isBlocked = true;
      blockReason = "NO_TENANT";
    }
  }

  console.log("\n================ DIAGNOSTICS ================");
  console.log(`Is Blocked: ${isBlocked}`);
  console.log(`Block Reason: ${blockReason}`);
}

check()
  .catch(e => console.error("Error running script:", e))
  .finally(() => prisma.$disconnect());
