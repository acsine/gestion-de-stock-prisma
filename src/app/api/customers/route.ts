// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const where: any = {};
  if (search) where.OR = [
    { name: { contains: search, mode: "insensitive" } },
    { phone: { contains: search } },
    { email: { contains: search, mode: "insensitive" } },
  ];
  const customers = await prisma.customer.findMany({ where, orderBy: { name: "asc" }, take: 50 });
  return NextResponse.json({ data: customers });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const customer = await prisma.customer.create({ data: parsed.data as any });
  return NextResponse.json({ data: customer, message: "Client créé" }, { status: 201 });
}
