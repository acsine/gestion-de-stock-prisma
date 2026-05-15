// src/app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee || (!isSuper && employee.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        dateOfBirth: (parsed.data.dateOfBirth && parsed.data.dateOfBirth !== "") ? new Date(parsed.data.dateOfBirth) : null,
        endDate: (parsed.data.endDate && parsed.data.endDate !== "") ? new Date(parsed.data.endDate) : null,
      }
    });

    return NextResponse.json({ data: updated, message: "Employé mis à jour" });
  } catch (error: any) {
    console.error("[API_EMPLOYEES_PATCH]", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    // Check for related data (payrolls, leaves)
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { _count: { select: { payrolls: true, leaves: true } } }
    });

    if (!employee || (!isSuper && employee.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });
    }
    
    if (employee._count.payrolls > 0) {
      return NextResponse.json({ error: "Impossible de supprimer cet employé car il a des fiches de paie associées." }, { status: 400 });
    }

    await prisma.employee.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Employé supprimé" });
  } catch (error: any) {
    console.error("[API_EMPLOYEES_DELETE]", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
