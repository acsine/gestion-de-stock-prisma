import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { active: false, authenticated: false },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          }
        }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isActive: true, isSuperAdmin: true, tenantId: true }
    });

    const isSuper = dbUser?.isSuperAdmin || false;
    let active = dbUser?.isActive || isSuper || false;

    // Si l'utilisateur est actif mais n'est pas Super Admin, on vérifie l'état de l'abonnement du locataire
    if (active && !isSuper && dbUser?.tenantId) {
      const sub = await getTenantSubscription(dbUser.tenantId);
      if (!sub || !sub.isValid) {
        active = false;
      }
    }

    return NextResponse.json(
      {
        active,
        authenticated: true
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { 
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        }
      }
    );
  }
}
