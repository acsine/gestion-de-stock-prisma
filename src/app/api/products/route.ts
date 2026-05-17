import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/audit";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }
    if (search) where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
    if (categoryId) where.categoryId = categoryId;
    if (status) {
      where.status = status;
    } else {
      where.status = { not: "ARCHIVE" };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, supplier: true },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ data: products, total, page, pageSize });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const canCreate = await hasPermission("products.create");
    if (!canCreate) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const body = await req.json();
    const isSuper = (session.user as any).isSuperAdmin;
    let tenantId = (session.user as any).tenantId || (isSuper ? body.tenantId : null);
    if (isSuper && !tenantId) {
      const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
      if (firstTenant) {
        tenantId = firstTenant.id;
      }
    }
    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const existing = await prisma.product.findFirst({ 
      where: { sku: parsed.data.sku, tenantId } 
    });
    if (existing) return NextResponse.json({ error: "SKU déjà utilisé" }, { status: 409 });

    let barcode = parsed.data.barcode;
    if (!barcode || barcode.trim() === "") {
      barcode = `PRD-${Date.now().toString().slice(-8)}`;
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        tenantId,
        barcode,
      },
      include: { category: true, supplier: true },
    });

    await logActivity({
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "Product",
      entityId: product.id,
      newValue: parsed.data,
    });

    return NextResponse.json({ data: product, message: "Produit créé" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
