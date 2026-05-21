// src/app/actions/admin-actions.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function executeRawSql(sql: string) {
  const session = await auth();
  if (!(session?.user as any)?.isSuperAdmin) {
    throw new Error("Accès refusé");
  }

  try {
    console.log("[SQL_CONSOLE] Executing:", sql);
    const result = await prisma.$queryRawUnsafe(sql);
    console.log("[SQL_CONSOLE] Success, rows/result:", Array.isArray(result) ? result.length : result);
    return { success: true, data: result };
  } catch (error: any) {
    console.error("[SQL_CONSOLE] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function getTenants() {
  const session = await auth();
  if (!(session?.user as any)?.isSuperAdmin) {
    throw new Error("Accès refusé");
  }

  return await prisma.tenant.findMany({
    include: { 
      license: true,
      users: {
        include: {
          role: true
        },
        orderBy: { createdAt: "desc" }
      },
      _count: { select: { users: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function toggleUserActiveStatus(userId: string, isActive: boolean) {
  const session = await auth();
  if (!(session?.user as any)?.isSuperAdmin) {
    throw new Error("Accès refusé");
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { isActive }
  });
}

export async function updateTenantLicense(tenantId: string, licenseId: string, subscriptionActive: boolean) {
  const session = await auth();
  if (!(session?.user as any)?.isSuperAdmin) {
    throw new Error("Accès refusé");
  }

  // 1. Mettre à jour le locataire (Tenant)
  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { 
      licenseId,
      subscriptionActive,
      status: subscriptionActive ? "ACTIVE" : "SUSPENDED",
      trialEndsAt: null // Once assigned a license, trial is over
    }
  });

  // 2. Propager l'activation/désactivation aux utilisateurs associés
  await prisma.user.updateMany({
    where: { tenantId },
    data: { isActive: subscriptionActive }
  });

  return updatedTenant;
}

export async function getLicenses() {
  return await prisma.license.findMany();
}

export async function updateLicenseDetails(licenseId: string, data: any) {
  const session = await auth();
  if (!(session?.user as any)?.isSuperAdmin) {
    throw new Error("Accès refusé");
  }

  return await prisma.license.update({
    where: { id: licenseId },
    data: {
      price: parseFloat(data.price),
      durationDays: parseInt(data.durationDays),
      maxUsers: parseInt(data.maxUsers),
      canDownload: data.canDownload === true || data.canDownload === "true"
    }
  });
}
