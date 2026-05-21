// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Only admins or superadmins can change user status or edit details
  const role = (session.user as any).role;
  const isSuper = (session.user as any).isSuperAdmin;
  if (role !== "ADMIN" && !isSuper) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  try {
    const tenantId = (session.user as any).tenantId;
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || (!isSuper && targetUser.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const body = await req.json();
    const dataToUpdate: any = {};
    dataToUpdate.isSynced = false;

    if (body.isActive !== undefined) {
      dataToUpdate.isActive = body.isActive;
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Email invalide" }, { status: 400 });
      }

      // Check if email is already taken by another user
      const duplicateUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id }
        }
      });
      if (duplicateUser) {
        return NextResponse.json({ error: "Cet email est déjà utilisé par un autre utilisateur" }, { status: 400 });
      }
      dataToUpdate.email = email;
    }

    if (body.roleId !== undefined) {
      dataToUpdate.roleId = body.roleId;
    }

    if (body.allowedCashAccountId !== undefined) {
      dataToUpdate.allowedCashAccountId = body.allowedCashAccountId;
    }

    if (body.password) {
      if (body.password.length < 8) {
        return NextResponse.json({ error: "Le mot de passe doit comporter au moins 8 caractères." }, { status: 400 });
      }
      dataToUpdate.passwordHash = await bcrypt.hash(body.password, 12);
      dataToUpdate.mustChangePassword = true; // force password change on reset
    }

    const user = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { 
        id: true, 
        name: true, 
        isActive: true, 
        email: true,
        allowedCashAccountId: true,
        allowedCashAccount: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ data: user, message: "Utilisateur mis à jour avec succès" });
  } catch (error) {
    console.error("[UPDATE_USER_ERROR]", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
