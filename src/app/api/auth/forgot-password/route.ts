// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        error: "Cet email ne correspond à aucun utilisateur actif dans le système."
      }, { status: 404 });
    }

    let finalTenantId = user.tenantId;
    if (!finalTenantId) {
      const firstTenant = await prisma.tenant.findFirst();
      if (firstTenant) {
        finalTenantId = firstTenant.id;
      } else {
        return NextResponse.json({
          error: "Aucune entreprise configurée dans le système pour associer la demande."
        }, { status: 400 });
      }
    }

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        subject: `Mot de passe oublié - ${user.email}`,
        priority: "URGENTE",
        tenantId: finalTenantId,
        userId: user.id,
        messages: {
          create: {
            content: `Demande urgente de réinitialisation de mon mot de passe. Email: ${user.email}`,
            userId: user.id,
          },
        },
      },
    });

    return NextResponse.json({ ticketId: ticket.id });
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
