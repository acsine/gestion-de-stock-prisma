import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return new Response("Non autorisé", { status: 401 });
  }

  const tenantId = (session.user as any).tenantId;
  const isSuper = (session.user as any).isSuperAdmin;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
  });

  if (!ticket) {
    return new Response("Ticket non trouvé", { status: 404 });
  }

  if (!isSuper && ticket.tenantId !== tenantId) {
    return new Response("Accès refusé", { status: 403 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // En-têtes pour Server-Sent Events (SSE)
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  });

  let loadedMessageIds = new Set<string>();

  // Récupérer et envoyer les messages initiaux
  const initialMessages = await prisma.ticketMessage.findMany({
    where: { ticketId: id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  initialMessages.forEach((msg) => loadedMessageIds.add(msg.id));
  
  // SSE exige le format "data: <string>\n\n"
  writer.write(encoder.encode(`data: ${JSON.stringify(initialMessages)}\n\n`));

  // Vérifier périodiquement les nouveaux messages en DB (toutes les 1,5 secondes)
  const interval = setInterval(async () => {
    try {
      const messages = await prisma.ticketMessage.findMany({
        where: { ticketId: id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      });

      const newMessages = messages.filter((msg) => !loadedMessageIds.has(msg.id));

      if (newMessages.length > 0) {
        newMessages.forEach((msg) => loadedMessageIds.add(msg.id));
        writer.write(encoder.encode(`data: ${JSON.stringify(messages)}\n\n`));
      }
    } catch (error) {
      clearInterval(interval);
      try {
        writer.close();
      } catch {}
    }
  }, 1500);

  // Nettoyer l'intervalle si le client ferme la connexion
  req.signal.addEventListener("abort", () => {
    clearInterval(interval);
    try {
      writer.close();
    } catch {}
  });

  return new Response(responseStream.readable, { headers });
}
