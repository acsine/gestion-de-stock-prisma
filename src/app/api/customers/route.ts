// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    
    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    if (search) where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];

    const customers = await prisma.customer.findMany({ 
      where, 
      orderBy: { name: "asc" }, 
      take: 50 
    });
    return NextResponse.json({ data: customers });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const isSuper = (session.user as any).isSuperAdmin;
    const body = await req.json();

    let tenantId = (session.user as any).tenantId || (isSuper ? body.tenantId : null);
    if (isSuper && !tenantId) {
      const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
      if (firstTenant) {
        tenantId = firstTenant.id;
      }
    }

    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const customer = await prisma.customer.create({ 
      data: { ...parsed.data, tenantId } as any 
    });
    return NextResponse.json({ data: customer, message: "Client créé" }, { status: 201 });
  } catch (error: any) {
    console.error("[API_CUSTOMERS_POST]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
