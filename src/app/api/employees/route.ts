// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";
import { logActivity } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    
    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    if (search) where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { position: { contains: search, mode: "insensitive" } },
    ];
    if (status) where.status = status;

    const employees = await prisma.employee.findMany({ 
      where, 
      orderBy: { lastName: "asc" } 
    });
    return NextResponse.json({ data: employees });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const isSuper = (session.user as any).isSuperAdmin;
    const role = (session.user as any).role;
    const body = await req.json();
    let tenantId = (session.user as any).tenantId || (isSuper ? body.tenantId : null);
    if (isSuper && !tenantId) {
      const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
      if (firstTenant) {
        tenantId = firstTenant.id;
      }
    }
    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

    if (!["ADMIN", "RH"].includes(role) && !isSuper) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const employee = await prisma.employee.create({
      data: { 
        ...parsed.data, 
        tenantId: tenantId!,
        startDate: new Date(parsed.data.startDate),
        dateOfBirth: (parsed.data.dateOfBirth && parsed.data.dateOfBirth !== "") ? new Date(parsed.data.dateOfBirth) : null,
        endDate: (parsed.data.endDate && parsed.data.endDate !== "") ? new Date(parsed.data.endDate) : null
      },
    });

    await logActivity({
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "Employee",
      entityId: employee.id,
      newValue: employee,
    });

    return NextResponse.json({ data: employee, message: "Employé créé" }, { status: 201 });
  } catch (error: any) {
    console.error("[API_EMPLOYEES_POST]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
