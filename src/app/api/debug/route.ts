import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Test database connection & query user count
    const usersCount = await prisma.user.count();
    
    // 2. Count tenants
    const tenantsCount = await prisma.tenant.count();
    
    // 3. Check if superadmin exists
    const superAdmin = await prisma.user.findUnique({
      where: { email: "superadmin@thaborsolution.com" },
      select: { email: true, isActive: true, isSuperAdmin: true }
    });
    
    return NextResponse.json({
      status: "success",
      message: "Database connection successful!",
      data: {
        usersCount,
        tenantsCount,
        superAdminExists: !!superAdmin,
        superAdminDetails: superAdmin || null
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
