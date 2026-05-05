// src/app/api/roles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const roles = await prisma.role.findMany({
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { name: "asc" }
  });
  
  return NextResponse.json({ data: roles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Permission refusée" }, { status: 403 });

  const { name, description, permissionIds } = await req.json();
  if (!name) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });

  try {
    const role = await prisma.role.create({
      data: {
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
