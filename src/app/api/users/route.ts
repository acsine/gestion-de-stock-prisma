// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;

  const where: any = {};
  if (!isSuper) {
    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
    where.tenantId = tenantId;
  } else if (tenantId) {
    where.tenantId = tenantId;
  }

  const users = await prisma.user.findMany({
    where,
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: { select: { id: true, name: true } }, 
      isActive: true, 
      lastLogin: true, 
      createdAt: true,
      allowedCashAccountId: true,
      allowedCashAccount: { select: { id: true, name: true } }
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const currentTenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;

  const { name, email, password, roleId, targetTenantId, employeeId, allowedCashAccountId } = await req.json();
  const finalTenantId = currentTenantId || targetTenantId;

  if (!finalTenantId) return NextResponse.json({ error: "Tenant ID requis" }, { status: 400 });
  if (!name || !email || !password || !roleId) return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  
  // Vérifier la limite d'utilisateurs de la licence du locataire (Tenant)
  const tenant = await prisma.tenant.findUnique({
    where: { id: finalTenantId },
    include: { license: true }
  });

  if (tenant?.license) {
    const currentUsersCount = await prisma.user.count({
      where: { tenantId: finalTenantId }
    });
    if (currentUsersCount >= tenant.license.maxUsers) {
      return NextResponse.json(
        { error: `Limite d'utilisateurs de votre forfait atteinte (${tenant.license.maxUsers} max). Veuillez modifier votre formule.` },
        { status: 403 }
      );
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
  
  const passwordHash = await bcrypt.hash(password, 12);
  
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, roleId, tenantId: finalTenantId, mustChangePassword: true, allowedCashAccountId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: { select: { name: true } }, 
        isActive: true,
        allowedCashAccountId: true
      },
    });

    if (employeeId) {
      await tx.employee.update({
        where: { id: employeeId },
        data: { userId: user.id }
      });
    }

    return user;
  });

  return NextResponse.json({ data: result, message: "Utilisateur créé" }, { status: 201 });
}

