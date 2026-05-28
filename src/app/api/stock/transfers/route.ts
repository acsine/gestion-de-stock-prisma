// src/app/api/stock/transfers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { warehouseTransferSchema } from "@/lib/validations";
import { logActivity } from "@/lib/audit";
import { eventEmitter } from "@/lib/events";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    const transfers = await prisma.warehouseTransfer.findMany({
      where,
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ data: transfers });
  } catch (error: any) {
    console.error("[API_TRANSFERS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const role = (session.user as any).role;
    const isSuper = (session.user as any).isSuperAdmin;

    if (!["ADMIN", "GESTIONNAIRE_STOCK"].includes(role) && !isSuper) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const tenantId = (session.user as any).tenantId;
    const body = await req.json();

    const parsed = warehouseTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { sourceWarehouseId, destinationWarehouseId, reference, notes, items } = parsed.data;

    let finalTenantId = tenantId || (isSuper ? body.tenantId : null);
    if (!finalTenantId) {
      return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      return NextResponse.json({ error: "L'entrepôt source et de destination doivent être différents." }, { status: 400 });
    }

    // Exécuter l'étape 1 en transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Vérifier la disponibilité des stocks
      for (const item of items) {
        const stock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: sourceWarehouseId,
              productId: item.productId
            }
          },
          include: { product: true }
        });

        if (!stock || stock.quantity < item.quantity) {
          const prodName = stock?.product?.name || "inconnu";
          const available = stock?.quantity || 0;
          throw new Error(`Stock insuffisant pour le produit "${prodName}". Disponible au dépôt source : ${available}`);
        }
      }

      // 2. Décrémenter le stock source et créer le transfert
      const transfer = await tx.warehouseTransfer.create({
        data: {
          tenantId: finalTenantId,
          sourceWarehouseId,
          destinationWarehouseId,
          reference,
          notes,
          userId: (session.user as any).id,
          status: "PENDING" // En attente de validation croisée
        }
      });

      // 3. Créer les articles du transfert
      const createdItems = [];
      for (const item of items) {
        const transferItem = await tx.warehouseTransferItem.create({
          data: {
            tenantId: finalTenantId,
            transferId: transfer.id,
            productId: item.productId,
            quantity: item.quantity
          },
          include: { product: true }
        });

        // Décrémenter immédiatement le stock dans le dépôt source (il est maintenant en transit)
        const updatedSourceStock = await tx.warehouseStock.update({
          where: {
            warehouseId_productId: {
              warehouseId: sourceWarehouseId,
              productId: item.productId
            }
          },
          data: {
            quantity: { decrement: item.quantity }
          },
          include: { product: true }
        });

        // Enregistrer le mouvement de stock SORTIE_TRANSFERT pour la source
        await tx.stockMovement.create({
          data: {
            tenantId: finalTenantId,
            productId: item.productId,
            type: "TRANSFERT_SORTIE",
            quantity: item.quantity,
            warehouseId: sourceWarehouseId,
            userId: (session.user as any).id,
            reason: `Sortie dépôt - Transfert #${transfer.id}`,
            reference: reference || `TR-${transfer.id}`
          }
        });

        // Recalculer le stock global agrégé du produit
        const allStocks = await tx.warehouseStock.findMany({
          where: { productId: item.productId }
        });
        const totalStock = allStocks.reduce((sum, s) => sum + s.quantity, 0);
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: totalStock }
        });

        // Générer des alertes pour le dépôt source
        await generateWarehouseAlerts(tx, finalTenantId, sourceWarehouseId, item.productId, updatedSourceStock.quantity, updatedSourceStock.minStock);

        createdItems.push(transferItem);
      }

      return { transfer, createdItems };
    });

    // Logger l'activité d'initiation
    await logActivity({
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "WarehouseTransfer",
      entityId: result.transfer.id,
      newValue: result
    });

    // Émettre l'événement temps réel SSE
    eventEmitter.emit("transfer_created", {
      tenantId: finalTenantId,
      transferId: result.transfer.id,
      message: `Nouveau transfert en attente depuis le dépôt principal.`
    });

    // Optionnel : Synchroniser en ligne si connecté
    triggerCloudSync();

    return NextResponse.json({
      data: result.transfer,
      items: result.createdItems,
      message: "Sortie de stock enregistrée. En attente de réception à la boutique destinataire."
    }, { status: 201 });

  } catch (error: any) {
    console.error("[API_TRANSFERS_POST]", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

// PATCH : Étape 2 - Valider la réception (Validation Boutique)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const isSuper = (session.user as any).isSuperAdmin;

    const tenantId = (session.user as any).tenantId;
    const body = await req.json();
    const { id, action } = body;

    if (!id || action !== "RECEIVE") {
      return NextResponse.json({ error: "L'identifiant du transfert et l'action 'RECEIVE' sont requis" }, { status: 400 });
    }

    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id },
      include: { items: true, sourceWarehouse: true, destinationWarehouse: true }
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfert non trouvé" }, { status: 404 });
    }

    let finalTenantId = tenantId || transfer.tenantId;
    if (!isSuper && transfer.tenantId !== finalTenantId) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    if (transfer.status !== "PENDING") {
      return NextResponse.json({ error: `Le transfert est déjà ${transfer.status}` }, { status: 400 });
    }

    // Effectuer la réception en transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Incrémenter le stock dans la destination et créer les mouvements
      for (const item of transfer.items) {
        // Obtenir la ligne de stock ou la créer si elle n'existe pas
        let destStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: transfer.destinationWarehouseId,
              productId: item.productId
            }
          }
        });

        if (!destStock) {
          // Récupérer le produit pour avoir les min/max par défaut
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          destStock = await tx.warehouseStock.create({
            data: {
              tenantId: finalTenantId,
              warehouseId: transfer.destinationWarehouseId,
              productId: item.productId,
              quantity: 0,
              minStock: Math.round((prod?.minStock || 5) * 0.2),
              maxStock: Math.round((prod?.maxStock || 100) * 0.5)
            }
          });
        }

        // Incrémenter la quantité
        const updatedDestStock = await tx.warehouseStock.update({
          where: { id: destStock.id },
          data: { quantity: { increment: item.quantity } }
        });

        // Enregistrer le mouvement de stock ENTREE_TRANSFERT pour la destination
        await tx.stockMovement.create({
          data: {
            tenantId: finalTenantId,
            productId: item.productId,
            type: "TRANSFERT_ENTREE",
            quantity: item.quantity,
            warehouseId: transfer.destinationWarehouseId,
            userId: (session.user as any).id,
            reason: `Réception boutique - Transfert #${transfer.id}`,
            reference: transfer.reference || `TR-${transfer.id}`
          }
        });

        // Recalculer le stock global agrégé du produit
        const allStocks = await tx.warehouseStock.findMany({
          where: { productId: item.productId }
        });
        const totalStock = allStocks.reduce((sum, s) => sum + s.quantity, 0);
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: totalStock }
        });

        // Générer des alertes de stock pour la boutique destinataire
        await generateWarehouseAlerts(tx, finalTenantId, transfer.destinationWarehouseId, item.productId, updatedDestStock.quantity, updatedDestStock.minStock);
      }

      // 2. Mettre à jour le statut du transfert
      const updatedTransfer = await tx.warehouseTransfer.update({
        where: { id },
        data: { status: "COMPLETED" },
        include: { items: { include: { product: true } }, sourceWarehouse: true, destinationWarehouse: true }
      });

      return updatedTransfer;
    });

    await logActivity({
      userId: (session.user as any).id,
      action: "UPDATE",
      entity: "WarehouseTransfer",
      entityId: result.id,
      newValue: result
    });

    // Émettre l'événement temps réel SSE
    eventEmitter.emit("transfer_received", {
      tenantId: finalTenantId,
      transferId: result.id,
      message: `Le transfert #${result.id} a été réceptionné avec succès.`
    });

    // Synchronisation en ligne
    triggerCloudSync();

    return NextResponse.json({
      data: result,
      message: "Réception de stock validée et enregistrée avec succès."
    });

  } catch (error: any) {
    console.error("[API_TRANSFERS_PATCH]", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

// Fonction de génération d'alertes par entrepôt
async function generateWarehouseAlerts(tx: any, tenantId: string, warehouseId: string, productId: string, currentStock: number, minStock: number | null) {
  if (minStock === null) return;

  // Nettoyer les anciennes alertes non lues pour ce produit dans cet entrepôt
  await tx.alert.deleteMany({
    where: { productId, tenantId, warehouseId, isRead: false }
  });

  const wh = await tx.warehouse.findUnique({ where: { id: warehouseId }, select: { name: true } });
  const whName = wh?.name || "Entrepôt";

  if (currentStock === 0) {
    await tx.alert.create({
      data: {
        tenantId,
        productId,
        warehouseId,
        type: "RUPTURE",
        message: `Rupture de stock dans l'entrepôt [${whName}] — quantité 0`
      }
    });
  } else if (currentStock <= minStock) {
    await tx.alert.create({
      data: {
        tenantId,
        productId,
        warehouseId,
        type: "STOCK_BAS",
        message: `Stock bas dans l'entrepôt [${whName}] : ${currentStock} unités (min: ${minStock})`
      }
    });
  }
}

// Lancement transparent de la synchronisation cloud en arrière-plan
function triggerCloudSync() {
  if (typeof fetch !== "undefined") {
    // Appel asynchrone non bloquant pour le client
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/sync/cloud`, { method: "POST" })
      .catch((e) => console.log("[BACKGROUND_SYNC_TRIGGER] Sync is stand-alone or host is offline"));
  }
}
