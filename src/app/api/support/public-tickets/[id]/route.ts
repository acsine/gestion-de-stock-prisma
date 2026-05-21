// src/app/api/support/public-tickets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        tenant: { select: { name: true } },
        messages: { 
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ data: ticket });
  } catch (error: any) {
    console.error("Public Ticket GET error:", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    // Create the message on behalf of the user who owns the ticket
    const message = await prisma.ticketMessage.create({
      data: {
        content: content.trim(),
        ticketId: id,
        userId: ticket.userId,
        isAdmin: false,
      },
    });

    // Update ticket timestamp
    await prisma.ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ data: message });
  } catch (error: any) {
    console.error("Public Ticket POST error:", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
