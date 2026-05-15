// src/app/api/products/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tenantId = (session.user as any).tenantId;
    if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const results = { imported: 0, errors: [] as string[], skipped: 0 };

    // Get default category for THIS tenant
    const defaultCategory = await prisma.category.findFirst({ where: { tenantId } });
    if (!defaultCategory) {
      return NextResponse.json({ error: "Aucune catégorie disponible. Veuillez en créer une d'abord." }, { status: 400 });
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;

      try {
        const sku = String(row["SKU"] || row["sku"] || "").trim();
        const name = String(row["Nom"] || row["name"] || row["Produit"] || "").trim();
        const buyPrice = parseFloat(row["Prix Achat"] || row["buyPrice"] || "0");
        const sellPrice = parseFloat(row["Prix Vente"] || row["sellPrice"] || "0");

        if (!sku || !name) {
          results.errors.push(`Ligne ${lineNum}: SKU et Nom requis`);
          continue;
        }
        if (buyPrice < 0 || sellPrice < 0) {
          results.errors.push(`Ligne ${lineNum}: Prix invalide pour "${name}"`);
          continue;
        }

        // Find or use default category
        const categoryName = String(row["Catégorie"] || row["category"] || "").trim();
        let category = defaultCategory;
        if (categoryName) {
          const found = await prisma.category.findFirst({ 
            where: { tenantId, name: { contains: categoryName, mode: "insensitive" } } 
          });
          if (found) category = found;
        }

        const existing = await prisma.product.findFirst({ where: { sku, tenantId } });
        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name,
              buyPrice,
              sellPrice,
              categoryId: category.id,
              minStock: parseFloat(row["Stock Min"] || "5"),
              maxStock: parseFloat(row["Stock Max"] || "100"),
              unit: String(row["Unité"] || "Pièce"),
            },
          });
          results.skipped++;
        } else {
          await prisma.product.create({
            data: {
              tenantId,
              sku,
              name,
              buyPrice,
              sellPrice,
              taxRate: parseFloat(row["TVA"] || "19.25"),
              categoryId: category.id,
              minStock: parseFloat(row["Stock Min"] || "5"),
              maxStock: parseFloat(row["Stock Max"] || "100"),
              unit: String(row["Unité"] || "Pièce"),
              currentStock: parseFloat(row["Stock Initial"] || "0"),
              description: String(row["Description"] || ""),
            },
          });
          results.imported++;
        }
      } catch (err: any) {
        results.errors.push(`Ligne ${lineNum}: ${err.message}`);
      }
    }

    return NextResponse.json({
      message: `Import terminé: ${results.imported} importés, ${results.skipped} mis à jour, ${results.errors.length} erreurs`,
      data: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
