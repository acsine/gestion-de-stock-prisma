// src/lib/subscription.ts
import { prisma } from "./prisma";

export async function getTenantSubscription(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { license: true }
  });

  if (!tenant) return null;

  const now = new Date();
  const isTrial = !tenant.licenseId;
  const isFree = tenant.license?.name === "GRATUIT";

  // 1. Trial check (no license assigned yet)
  if (isTrial && tenant.trialEndsAt && now > tenant.trialEndsAt) {
    return { 
      isValid: false, 
      reason: "TRIAL_EXPIRED", 
      trialEndsAt: tenant.trialEndsAt,
      license: tenant.license 
    };
  }

  // 2. Subscription suspension check
  if (!tenant.subscriptionActive) {
    return { isValid: false, reason: "SUSPENDED", license: tenant.license };
  }

  // 3. License expiration check (paid licenses use trialEndsAt as expiry date)
  // Free plans with active subscription don't expire based on trialEndsAt
  if (!isFree && !isTrial && tenant.trialEndsAt && now > tenant.trialEndsAt) {
    // Auto-suspend the tenant when license expires
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionActive: false, status: "SUSPENDED" }
    });
    await prisma.user.updateMany({
      where: { tenantId },
      data: { isActive: false }
    });
    return { isValid: false, reason: "LICENSE_EXPIRED", license: tenant.license };
  }

  return { 
    isValid: true, 
    license: tenant.license,
    canDownload: tenant.license?.canDownload || false
  };
}
