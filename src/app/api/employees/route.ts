// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const where: any = {};
  if (search) where.OR = [
    { firstName: { contains: search, mode: "insensitive" } },
    { lastName: { contains: search, mode: "insensitive" } },
    { position: { contains: search, mode: "insensitive" } },
  ];
  if (status) where.status = status;
  const employees = await prisma.employee.findMany({ where, orderBy: { lastName: "asc" } });
  return NextResponse.json({ data: employees });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "RH"].includes(role)) return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  const body = await req.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const employee = await prisma.employee.create({
    data: { ...parsed.data, startDate: new Date(parsed.data.startDate) },
  });
  return NextResponse.json({ data: employee, message: "Employé créé" }, { status: 201 });
}
