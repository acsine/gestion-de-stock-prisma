import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
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
