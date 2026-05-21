// src/app/api/superadmin/support/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

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

    // 1. Récupérer le ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    if (!ticket.userId) {
      return NextResponse.json({ error: "Ce ticket n'est pas associé à un utilisateur valide" }, { status: 400 });
    }

    // 2. Générer le hash pour le mot de passe par défaut "12345678"
    const passwordHash = await bcrypt.hash("12345678", 12);

    // 3. Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: ticket.userId },
      data: {
        passwordHash,
        mustChangePassword: true, // Forcer la modification au prochain login
      },
    });

    // 4. Créer un message de support automatique dans la conversation
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: (session.user as any).id, // Admin connecté
        content: `🔑 MOT DE PASSE RÉINITIALISÉ ! Votre mot de passe a été réinitialisé à la valeur par défaut : 12345678. Vous pouvez désormais vous connecter avec votre adresse email et ce mot de passe temporaire. Dès votre connexion, vous serez automatiquement redirigé pour définir un nouveau mot de passe hautement sécurisé.`,
        isAdmin: true,
      },
    });

    // 5. Marquer le ticket comme résolu
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "RESOLU" },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Le mot de passe de l'utilisateur ${ticket.user?.name || ""} (${ticket.user?.email || ""}) a été réinitialisé avec succès.`
    });
  } catch (error: any) {
    console.error("[RESET PASSWORD SUPPORT ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
