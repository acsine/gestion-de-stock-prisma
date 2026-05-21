import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get("email");

    if (emailParam) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: emailParam.trim(), mode: "insensitive" } },
        include: {
          tenant: {
            include: {
              license: true
            }
          }
        }
      });

      if (!user) {
        return NextResponse.json({
          status: "error",
          message: `User with email '${emailParam}' not found.`
        }, { status: 404 });
      }

      const now = new Date();
      const isTrial = !user.tenant?.licenseId || user.tenant?.license?.name === "GRATUIT";
      let subscriptionStatus = "VALID";
      let isBlocked = false;
      let blockReason = "";

      if (!user.isSuperAdmin) {
        if (!user.isActive) {
          isBlocked = true;
          blockReason = "USER_INACTIVE";
        } else if (user.tenant) {
          if (isTrial && user.tenant.trialEndsAt && now > user.tenant.trialEndsAt) {
            isBlocked = true;
            blockReason = "TRIAL_EXPIRED";
            subscriptionStatus = "EXPIRED";
          } else if (!user.tenant.subscriptionActive) {
            isBlocked = true;
            blockReason = "SUSPENDED";
            subscriptionStatus = "SUSPENDED";
          }
        } else {
          isBlocked = true;
          blockReason = "NO_TENANT";
        }
      }

      return NextResponse.json({
        status: "success",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            isActive: user.isActive,
            isSuperAdmin: user.isSuperAdmin,
            tenantId: user.tenantId
          },
          tenant: user.tenant ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            subscriptionActive: user.tenant.subscriptionActive,
            trialEndsAt: user.tenant.trialEndsAt,
            licenseId: user.tenant.licenseId,
            licenseName: user.tenant.license?.name || "NONE",
            isTrial
          } : null,
          diagnostics: {
            isBlocked,
            blockReason,
            subscriptionStatus,
            currentTime: now.toISOString()
          }
        }
      });
    }

    // 1. Test database connection & query counts
    const usersCount = await prisma.user.count();
    const tenantsCount = await prisma.tenant.count();
    
    // 2. Fetch the superadmin
    const superAdmin = await prisma.user.findUnique({
      where: { email: "superadmin@thaborsolution.com" },
    });

    let superAdminPasswordMatch = false;
    let superAdminRepaired = false;

    if (superAdmin) {
      // Test if current password in db matches "SuperAdmin@2026"
      superAdminPasswordMatch = await bcrypt.compare("SuperAdmin@2026", superAdmin.passwordHash);
      
      // If it doesn't match, let's force-update it to the correct hash!
      if (!superAdminPasswordMatch) {
        const correctHash = await bcrypt.hash("SuperAdmin@2026", 12);
        await prisma.user.update({
          where: { email: "superadmin@thaborsolution.com" },
          data: { passwordHash: correctHash }
        });
        superAdminPasswordMatch = true;
        superAdminRepaired = true;
      }
    }

    // 3. Fetch the merchant
    const merchant = await prisma.user.findUnique({
      where: { email: "marchand@thaborsolution.com" },
    });

    let merchantPasswordMatch = false;
    let merchantRepaired = false;

    if (merchant) {
      // Test if current password in db matches "Merchant@123"
      merchantPasswordMatch = await bcrypt.compare("Merchant@123", merchant.passwordHash);
      
      // If it doesn't match, let's force-update it to the correct hash!
      if (!merchantPasswordMatch) {
        const correctHash = await bcrypt.hash("Merchant@123", 12);
        await prisma.user.update({
          where: { email: "marchand@thaborsolution.com" },
          data: { passwordHash: correctHash }
        });
        merchantPasswordMatch = true;
        merchantRepaired = true;
      }
    }

    return NextResponse.json({
      status: "success",
      message: "Database connection successful!",
      data: {
        usersCount,
        tenantsCount,
        superAdmin: {
          exists: !!superAdmin,
          isActive: superAdmin?.isActive || false,
          passwordMatchesBeforeTest: !superAdminRepaired,
          repairedNow: superAdminRepaired
        },
        merchant: {
          exists: !!merchant,
          isActive: merchant?.isActive || false,
          passwordMatchesBeforeTest: !merchantRepaired,
          repairedNow: merchantRepaired
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: "Failed to connect to database or query tables.",
      error: error.message || String(error),
      stack: error.stack || null
    }, { status: 500 });
  }
}
