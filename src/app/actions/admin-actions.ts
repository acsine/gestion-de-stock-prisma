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
      _count: { select: { users: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function updateTenantLicense(tenantId: string, licenseId: string, subscriptionActive: boolean) {
  const session = await auth();
  if (!(session?.user as any)?.isSuperAdmin) {
    throw new Error("Accès refusé");
  }

  return await prisma.tenant.update({
    where: { id: tenantId },
    data: { 
      licenseId,
      subscriptionActive,
      trialEndsAt: null // Once assigned a license, trial is over
    }
  });
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
