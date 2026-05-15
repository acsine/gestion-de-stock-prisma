// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Only admins can change user status
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  try {
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || (!isSuper && targetUser.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const { isActive } = await req.json();
    
    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, isActive: true }
    });

    return NextResponse.json({ data: user, message: `Utilisateur ${isActive ? 'activé' : 'désactivé'}` });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
