// src/app/api/suppliers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { supplierSchema } from "@/lib/validations";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (!(await hasPermission("suppliers.view"))) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const where: any = { id };
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    }

    const supplier = await prisma.supplier.findUnique({ where });
    if (!supplier) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ data: supplier });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (!(await hasPermission("suppliers.edit"))) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;
    const body = await req.json();

    const where: any = { id };
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    }

    const existingSupplier = await prisma.supplier.findUnique({ where });
    if (!existingSupplier) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 });
    }

    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const supplier = await prisma.supplier.update({
      where: { id },
      data: parsed.data
    });

    return NextResponse.json({ data: supplier, message: "Fournisseur mis à jour" });
  } catch (error: any) {
    console.error("[SUPPLIER_PUT_ERROR]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (!(await hasPermission("suppliers.delete"))) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const where: any = { id };
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    }

    const supplier = await prisma.supplier.findUnique({ where });
    if (!supplier) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 });
    }

    // Protect data integrity: block if has associated purchase orders
    const relatedOrdersCount = await prisma.purchaseOrder.count({
      where: { supplierId: id }
    });
    if (relatedOrdersCount > 0) {
      return NextResponse.json({ 
        error: "Impossible de supprimer ce fournisseur car il possède des bons de commande associés." 
      }, { status: 400 });
    }

    // Block if has associated financial transactions
    const relatedTransactionsCount = await prisma.transaction.count({
      where: { supplierId: id }
    });
    if (relatedTransactionsCount > 0) {
      return NextResponse.json({ 
        error: "Impossible de supprimer ce fournisseur car il possède des transactions financières associées." 
      }, { status: 400 });
    }

    await prisma.supplier.delete({ where: { id } });

    return NextResponse.json({ message: "Fournisseur supprimé avec succès" });
  } catch (error: any) {
    console.error("[SUPPLIER_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
