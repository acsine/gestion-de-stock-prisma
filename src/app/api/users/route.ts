// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // We'll update the role check to be more robust later, for now just allow or check role name
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: { select: { id: true, name: true } }, isActive: true, lastLogin: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
  const { name, email, password, roleId } = await req.json();
  if (!name || !email || !password || !roleId) return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, roleId, mustChangePassword: true },
    select: { id: true, name: true, email: true, role: { select: { name: true } }, isActive: true },
  });
  return NextResponse.json({ data: user, message: "Utilisateur créé" }, { status: 201 });
}
