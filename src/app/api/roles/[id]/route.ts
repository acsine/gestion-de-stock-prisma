// src/app/api/roles/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const { id } = await params;
  const userRole = (session.user as any).role;
  const isSuper = (session.user as any).isSuperAdmin;
  const tenantId = (session.user as any).tenantId;

  if (userRole !== "ADMIN" && !isSuper) return NextResponse.json({ error: "Permission refusée" }, { status: 403 });

  // Get the existing role to verify ownership
  const existingRole = await prisma.role.findUnique({
    where: { id }
  });

  if (!existingRole) return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 });

  // Verify tenant ownership
  if (!isSuper && existingRole.tenantId !== tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Prevent editing the name of the system "ADMIN" role
  if (existingRole.name === "ADMIN") {
    return NextResponse.json({ error: "Le rôle ADMIN ne peut pas être modifié" }, { status: 400 });
  }

  const { 
    name, 
    description, 
    permissionIds,
    is_head_departement,
    is_manager_sector,
    is_saler_role,
    is_unique
  } = await req.json();

  if (!name) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });

  try {
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        isSynced: false,
        is_head_departement: is_head_departement !== undefined ? !!is_head_departement : undefined,
        is_manager_sector: is_manager_sector !== undefined ? !!is_manager_sector : undefined,
        is_saler_role: is_saler_role !== undefined ? !!is_saler_role : undefined,
        is_unique: is_unique !== undefined ? !!is_unique : undefined,
        permissions: {
          set: (permissionIds || []).map((pid: string) => ({ id: pid }))
        }
      },
      include: { permissions: true }
    });

    return NextResponse.json({ data: updatedRole, message: "Rôle mis à jour avec succès" });
  } catch (error: any) {
    if (error.code === "P2002") return NextResponse.json({ error: "Ce nom de rôle existe déjà" }, { status: 400 });
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const { id } = await params;
  const userRole = (session.user as any).role;
  const isSuper = (session.user as any).isSuperAdmin;
  const tenantId = (session.user as any).tenantId;

  if (userRole !== "ADMIN" && !isSuper) return NextResponse.json({ error: "Permission refusée" }, { status: 403 });

  // Get the existing role to verify ownership
  const existingRole = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } }
  });

  if (!existingRole) return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 });

  // Verify tenant ownership
  if (!isSuper && existingRole.tenantId !== tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  if (existingRole.name === "ADMIN") {
    return NextResponse.json({ error: "Le rôle ADMIN ne peut pas être supprimé" }, { status: 400 });
  }

  if (existingRole._count.users > 0) {
    return NextResponse.json({ error: "Impossible de supprimer ce rôle car il est attribué à des utilisateurs" }, { status: 400 });
  }

  try {
    await prisma.role.delete({
      where: { id }
    });
    return NextResponse.json({ message: "Rôle supprimé avec succès" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
