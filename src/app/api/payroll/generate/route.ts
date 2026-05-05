// src/app/api/payroll/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "RH", "COMPTABLE"].includes(role)) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const { month, year } = await req.json();
  if (!month || !year) return NextResponse.json({ error: "Mois et année requis" }, { status: 400 });

  const settings = await prisma.setting.findFirst({ where: { key: "social_charges_rate" } });
  const socialRate = parseFloat(settings?.value || "17.5") / 100;

  const employees = await prisma.employee.findMany({ where: { status: "ACTIF" } });
  const generated = [];

  for (const emp of employees) {
    const exists = await prisma.payroll.findFirst({ where: { employeeId: emp.id, month, year } });
    if (exists) { generated.push(exists); continue; }

    const socialCharges = emp.baseSalary * socialRate;
    const netSalary = emp.baseSalary - socialCharges;

    const payroll = await prisma.payroll.create({
      data: {
        employeeId: emp.id,
        month,
        year,
        baseSalary: emp.baseSalary,
        bonuses: 0,
        deductions: 0,
        socialCharges,
        netSalary,
        status: "BROUILLON",
        processedById: (session.user as any).id,
      },
      include: { employee: true },
    });
    generated.push(payroll);
  }

  return NextResponse.json({ data: generated, message: `${generated.length} fiches générées` });
}
