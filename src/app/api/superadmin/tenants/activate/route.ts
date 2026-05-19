import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(session.user as any).isSuperAdmin) {
      return NextResponse.json({ error: "Non autorisé. Droits SuperAdmin requis." }, { status: 401 });
    }

    const { ticketId } = await req.json();
    if (!ticketId) {
      return NextResponse.json({ error: "ID du ticket requis" }, { status: 400 });
    }

    // 1. Récupérer le ticket avec le locataire (tenant) et l'utilisateur
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        tenant: true,
        user: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    // 2. Extraire la formule choisie à partir du sujet du ticket (ex: "Paiement Manuel — PROFESSIONNEL")
    let licenseName = "PROFESSIONNEL"; // Valeur par défaut
    if (ticket.subject.includes("GRATUIT")) licenseName = "GRATUIT";
    else if (ticket.subject.includes("ENTREPRISE")) licenseName = "ENTREPRISE";

    // Récupérer les informations de la licence
    const license = await prisma.license.findUnique({
      where: { name: licenseName },
    });

    if (!license) {
      return NextResponse.json({ error: `Licence ${licenseName} non trouvée en base de données` }, { status: 404 });
    }

    // 3. Mettre à jour le locataire (Tenant)
    await prisma.tenant.update({
      where: { id: ticket.tenantId },
      data: {
        status: "ACTIVE",
        licenseId: license.id,
        subscriptionActive: true,
        trialEndsAt: new Date(Date.now() + license.durationDays * 24 * 60 * 60 * 1000), // Expiration calculée
      },
    });

    // 4. Activer tous les utilisateurs de ce locataire
    await prisma.user.updateMany({
      where: { tenantId: ticket.tenantId },
      data: { isActive: true },
    });

    // 5. Créer un message de validation automatique dans le chat du ticket
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: (session.user as any).id, // L'admin connecté
        content: `✅ PAIEMENT VALIDÉ ! Votre formule ${license.name} (${license.price.toLocaleString("fr-FR")} XAF) a été activée pour une durée de ${license.durationDays} jours. Tous vos accès et utilisateurs sont désormais débloqués. Vous pouvez à présent rafraîchir et accéder à votre tableau de bord. Merci de votre confiance !`,
        isAdmin: true,
      },
    });

    // 6. Clore le ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "RESOLU" },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Formule ${licenseName} activée avec succès pour le tenant ${ticket.tenant.name}` 
    });
  } catch (error: any) {
    console.error("[ACTIVATE TENANT ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
