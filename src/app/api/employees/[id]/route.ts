// src/app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      }
    });

    return NextResponse.json({ data: employee, message: "Employé mis à jour" });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // Check for related data (payrolls, leaves)
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { _count: { select: { payrolls: true, leaves: true } } }
    });

    if (!employee) return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });
    
    if (employee._count.payrolls > 0) {
      return NextResponse.json({ error: "Impossible de supprimer cet employé car il a des fiches de paie associées." }, { status: 400 });
    }

    await prisma.employee.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Employé supprimé" });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
