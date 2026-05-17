// src/app/api/roles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;

  const { searchParams } = new URL(req.url);
  const queryTenantId = searchParams.get("tenantId");
  const finalTenantId = tenantId || (isSuper ? queryTenantId : null);

  const where: any = {};
  if (!isSuper) {
    if (!finalTenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
    where.tenantId = finalTenantId;
  } else if (finalTenantId) {
    where.tenantId = finalTenantId;
  }

  const roles = await prisma.role.findMany({
    where,
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { name: "asc" }
  });
  
  return NextResponse.json({ data: roles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const role = (session.user as any).role;
  const isSuper = (session.user as any).isSuperAdmin;
  const tenantId = (session.user as any).tenantId;

  if (role !== "ADMIN" && !isSuper) return NextResponse.json({ error: "Permission refusée" }, { status: 403 });

  const { name, description, permissionIds, targetTenantId } = await req.json();
  const finalTenantId = tenantId || targetTenantId;

  if (!finalTenantId) return NextResponse.json({ error: "Tenant ID requis" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });

  try {
    const role = await prisma.role.create({
      data: {
        tenantId: finalTenantId,
        name,
        description,
        permissions: {
          connect: (permissionIds || []).map((id: string) => ({ id }))
        }
      },
      include: { permissions: true }
    });
    return NextResponse.json({ data: role, message: "Rôle créé avec succès" }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") return NextResponse.json({ error: "Ce nom de rôle existe déjà" }, { status: 400 });
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
