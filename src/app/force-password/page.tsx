// src/app/force-password/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ForcePasswordForm } from "./ForcePasswordForm";

export default async function ForcePasswordPage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/login");
  }

  // Live real-time check of the database to guarantee perfect state sync
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });

  // If the user has already changed their password, redirect to the dashboard
  if (!dbUser || !dbUser.mustChangePassword) {
    redirect("/dashboard");
  }

  return <ForcePasswordForm />;
}
