// src/app/api/support/tickets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;

  const tickets = await prisma.ticket.findMany({
    where: isSuper ? {} : { tenantId },
    include: {
      user: { select: { name: true, email: true } },
      tenant: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: tickets });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const userId = (session.user as any).id;

  if (!tenantId) return NextResponse.json({ error: "Action impossible pour un SuperAdmin" }, { status: 400 });

  const { subject, message, priority } = await req.json();

  if (!subject || !message) {
    return NextResponse.json({ error: "Sujet et message requis" }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      priority: priority || "NORMALE",
      tenantId,
      userId,
      messages: {
        create: {
          content: message,
          userId,
        },
      },
    },
    include: {
      messages: true,
    },
  });

  return NextResponse.json({ data: ticket, message: "Ticket créé avec succès" });
}
