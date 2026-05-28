import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { prisma } from "@/lib/prisma";
import { getTenantSubscription } from "@/lib/subscription";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || !session.user?.id) redirect("/login");

  // Real-time check if the user is active in the database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, isSuperAdmin: true, tenantId: true, mustChangePassword: true }
  });

  if (dbUser?.mustChangePassword) {
    redirect("/force-password");
  }

  const isSuper = dbUser?.isSuperAdmin || (session.user as any)?.isSuperAdmin;

  if (!isSuper) {
    if (!dbUser || !dbUser.isActive) {
      redirect("/blocked");
    }

    if (dbUser.tenantId) {
      const sub = await getTenantSubscription(dbUser.tenantId);
      if (!sub || !sub.isValid) {
        redirect("/blocked");
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
