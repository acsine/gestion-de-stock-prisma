// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } }, children: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: categories });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  
  const data = { ...parsed.data };
  if (!data.slug) {
    data.slug = data.name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    // Check if slug exists, add random suffix if needed
    const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) {
      data.slug = `${data.slug}-${Math.random().toString(36).substring(2, 5)}`;
    }
  }

  const category = await prisma.category.create({ data: data as any });
  return NextResponse.json({ data: category, message: "Catégorie créée" }, { status: 201 });
}
