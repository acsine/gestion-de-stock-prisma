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

    // 4.5 Envoyer le mot de passe temporaire par e-mail
    if (ticket.user?.email) {
      try {
        await fetch("https://notification-app-jm3r.vercel.app/v1/notification/send-email/json", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to_email: [ticket.user.email],
            subject: "Réinitialisation de votre mot de passe - ThaborSolution",
            message: `Bonjour ${ticket.user.name || ""},\n\nVotre mot de passe a été réinitialisé par l'administrateur suite à votre demande sur l'espace de support.\n\nVotre mot de passe temporaire est : 12345678\n\nLors de votre prochaine connexion, vous serez invité à définir un nouveau mot de passe sécurisé.\n\nCordialement,\nL'équipe ThaborSolution.`,
            title: "Mot de passe réinitialisé",
            button_text: "Se connecter",
            button_url: process.env.NEXTAUTH_URL || "http://localhost:3000",
            use_template: true,
          }),
        });
      } catch (emailErr) {
        console.error("[EMAIL SEND ERROR]", emailErr);
      }
    }

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
