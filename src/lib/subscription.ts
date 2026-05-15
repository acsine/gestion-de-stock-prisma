// src/lib/subscription.ts
import { prisma } from "./prisma";

export async function getTenantSubscription(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { license: true }
  });

  if (!tenant) return null;

  const isTrial = !tenant.licenseId || tenant.license?.name === "GRATUIT";
  const now = new Date();
  
  // Trial check
  if (isTrial && tenant.trialEndsAt && now > tenant.trialEndsAt) {
    return { 
      isValid: false, 
      reason: "TRIAL_EXPIRED", 
      trialEndsAt: tenant.trialEndsAt,
      license: tenant.license 
    };
  }

  // Active check
  if (!tenant.subscriptionActive) {
    return { isValid: false, reason: "SUSPENDED", license: tenant.license };
  }

  return { 
    isValid: true, 
    license: tenant.license,
    canDownload: tenant.license?.canDownload || false
  };
}
