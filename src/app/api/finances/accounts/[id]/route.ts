// src/app/api/finances/accounts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const role = (session.user as any).role;
  const isSuper = (session.user as any).isSuperAdmin;

  // Only admins or superadmins can update cash accounts
  if (role !== "ADMIN" && !isSuper) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  try {
    const tenantId = (session.user as any).tenantId;
    const account = await prisma.cashAccount.findUnique({ where: { id } });

    if (!account || (!isSuper && account.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Compte non trouvé" }, { status: 404 });
    }

    const body = await req.json();
    const dataToUpdate: any = {};

    if (body.name !== undefined) dataToUpdate.name = body.name;
    if (body.type !== undefined) dataToUpdate.type = body.type;
    if (body.isActive !== undefined) dataToUpdate.isActive = body.isActive;
    if (body.balance !== undefined) dataToUpdate.balance = parseFloat(body.balance || "0");

    const updatedAccount = await prisma.cashAccount.update({
      where: { id },
      data: dataToUpdate,
    });

    // Audit logging
    await logActivity({
      userId: (session.user as any).id,
      action: "UPDATE",
      entity: "CashAccount",
      entityId: id,
      oldValue: account,
      newValue: updatedAccount,
    });

    return NextResponse.json({
      data: updatedAccount,
      message: "Compte financier mis à jour avec succès",
    });
  } catch (error: any) {
    console.error("[UPDATE_ACCOUNT_ERROR]", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du compte" }, { status: 500 });
  }
}
