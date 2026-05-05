// src/app/api/payroll/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const where: any = {};
  if (month) where.month = month;
  if (year) where.year = year;
  const payrolls = await prisma.payroll.findMany({
    where, include: { employee: true }, orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ data: payrolls });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id, status, bonuses, deductions } = await req.json();
  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });

  const settings = await prisma.setting.findMany({ where: { key: "social_charges_rate" } });
  const socialRate = parseFloat(settings[0]?.value || "17.5") / 100;

  const grossSalary = payroll.baseSalary + (bonuses ?? payroll.bonuses);
  const socialCharges = grossSalary * socialRate;
  const netSalary = grossSalary - socialCharges - (deductions ?? payroll.deductions);

  const updated = await prisma.payroll.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(bonuses !== undefined && { bonuses }),
      ...(deductions !== undefined && { deductions }),
      socialCharges,
      netSalary,
      ...(status === "PAYE" && { paidAt: new Date() }),
      processedById: (session.user as any).id,
    },
    include: { employee: true },
  });
  return NextResponse.json({ data: updated });
}
