import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;
    const role = (session.user as any).role;

    if (!["ADMIN", "GESTIONNAIRE_STOCK"].includes(role) && !isSuper) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || (!isSuper && category.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Catégorie non trouvée" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, color } = body;

    const updated = await prisma.category.update({
      where: { id },
      data: { name, description, color },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;
    const role = (session.user as any).role;

    if (!["ADMIN"].includes(role) && !isSuper) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || (!isSuper && category.tenantId !== tenantId)) {
      return NextResponse.json({ error: "Catégorie non trouvée" }, { status: 404 });
    }

    // Check if category has products
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json({ error: `Impossible de supprimer. Cette catégorie contient ${count} produit(s).` }, { status: 400 });
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Catégorie supprimée" });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
