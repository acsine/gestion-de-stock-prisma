import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTenantSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BlockedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  
  if (session && session.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isActive: true, isSuperAdmin: true, tenantId: true }
    });

    const isSuper = dbUser?.isSuperAdmin || (session.user as any)?.isSuperAdmin;
    let isActive = false;

    if (isSuper) {
      isActive = true;
    } else if (dbUser && dbUser.isActive) {
      isActive = true;
      if (dbUser.tenantId) {
        const sub = await getTenantSubscription(dbUser.tenantId);
        if (!sub || !sub.isValid) {
          isActive = false;
        }
      }
    }

    if (isActive) {
      redirect("/dashboard");
    }
  }

  return <>{children}</>;
}
