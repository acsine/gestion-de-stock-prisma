import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const tenantId = (session.user as any).tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Aucun tenant associé à cet utilisateur" }, { status: 400 });
    }

    const { licenseName } = await req.json();
    if (!licenseName) {
      return NextResponse.json({ error: "Formule de licence requise" }, { status: 400 });
    }

    // Récupérer les informations de la licence
    const license = await prisma.license.findUnique({
      where: { name: licenseName },
    });

    if (!license) {
      return NextResponse.json({ error: `Licence ${licenseName} non trouvée` }, { status: 404 });
    }

    // Mettre à jour le locataire (Tenant) - Activation automatique suite à paiement carte simulé réussi
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "ACTIVE",
        licenseId: license.id,
        subscriptionActive: true,
        trialEndsAt: new Date(Date.now() + license.durationDays * 24 * 60 * 60 * 1000), // Expiration calculée
      },
    });

    // Activer tous les utilisateurs de ce locataire
    await prisma.user.updateMany({
      where: { tenantId },
      data: { isActive: true },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Formule ${licenseName} activée avec succès !` 
    });
  } catch (error: any) {
    console.error("[AUTO SUBSCRIBE ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
