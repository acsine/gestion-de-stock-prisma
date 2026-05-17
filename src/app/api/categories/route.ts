import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";
import { logActivity } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    const categories = await prisma.category.findMany({
      where,
      include: { _count: { select: { products: true } }, children: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: categories });
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

    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    
    const data = { ...parsed.data, tenantId };
    if (!data.slug) {
      const baseSlug = data.name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      
      data.slug = baseSlug;

      // Check if slug exists for this tenant, add random suffix if needed
      const existing = await prisma.category.findFirst({ 
        where: { slug: data.slug, tenantId } 
      });
      if (existing) {
        data.slug = `${baseSlug}-${Math.random().toString(36).substring(2, 5)}`;
      }
    }

    const category = await prisma.category.create({ data: data as any });

    await logActivity({
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "Category",
      entityId: category.id,
      newValue: category,
    });

    return NextResponse.json({ data: category, message: "Catégorie créée" }, { status: 201 });
  } catch (error: any) {
    console.error("[API_CATEGORIES_POST]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
