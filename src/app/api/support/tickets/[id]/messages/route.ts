// src/app/api/support/tickets/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = (session.user as any).id;
  const isSuper = (session.user as any).isSuperAdmin;
  const { content } = await req.json();

  if (!content) return NextResponse.json({ error: "Message vide" }, { status: 400 });

  const ticket = await prisma.ticket.findUnique({
    where: { id },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });

  const message = await prisma.ticketMessage.create({
    data: {
      content,
      ticketId: id,
      userId,
      isAdmin: isSuper,
    },
  });

  // Update ticket timestamp
  await prisma.ticket.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ data: message });
}
