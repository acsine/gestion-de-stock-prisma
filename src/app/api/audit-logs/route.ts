import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const role = (session.user as any).role;
    const isSuper = (session.user as any).isSuperAdmin;

    if (role !== "ADMIN" && !isSuper) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const action = searchParams.get("action") || "";
    const entity = searchParams.get("entity") || "";
    const search = searchParams.get("search") || "";

    const where: any = {};

    // Multi-tenant isolation: regular admins only see logs from their own tenant!
    if (!isSuper) {
      const tenantId = (session.user as any).tenantId;
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.user = { tenantId };
    }

    if (action) {
      where.action = action;
    }
    if (entity) {
      where.entity = entity;
    }
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      total,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("[API_AUDIT_LOGS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
