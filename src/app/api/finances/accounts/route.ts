// src/app/api/finances/accounts/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const accounts = await prisma.cashAccount.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ data: accounts });
}
