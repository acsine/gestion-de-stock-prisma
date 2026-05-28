// src/app/api/stock/transfers/events/route.ts
import { NextRequest } from "next/server";
import { eventEmitter } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  const responseStream = new ReadableStream({
    start(controller) {
      // 1. Déclarer les écouteurs d'événements
      const onTransferCreated = (data: any) => {
        if (!tenantId || data.tenantId === tenantId) {
          try {
            controller.enqueue(`event: transfer_created\ndata: ${JSON.stringify(data)}\n\n`);
          } catch (e) {
            console.error("[SSE] Error enqueuing transfer_created", e);
          }
        }
      };

      const onTransferReceived = (data: any) => {
        if (!tenantId || data.tenantId === tenantId) {
          try {
            controller.enqueue(`event: transfer_received\ndata: ${JSON.stringify(data)}\n\n`);
          } catch (e) {
            console.error("[SSE] Error enqueuing transfer_received", e);
          }
        }
      };

      // Envoyer un message de bienvenue de connexion pour valider le stream immédiatement
      try {
        controller.enqueue(`event: welcome\ndata: ${JSON.stringify({ connected: true, timestamp: Date.now() })}\n\n`);
      } catch (e) {
        console.error("[SSE] Error sending welcome message", e);
      }

      // 2. S'abonner aux événements du Singleton Global
      eventEmitter.on("transfer_created", onTransferCreated);
      eventEmitter.on("transfer_received", onTransferReceived);

      // 3. Gérer la déconnexion propre du client
      req.signal.addEventListener("abort", () => {
        console.log(`[SSE] Client SSE déconnecté pour le tenant: ${tenantId}`);
        eventEmitter.off("transfer_created", onTransferCreated);
        eventEmitter.off("transfer_received", onTransferReceived);
      });
    }
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no" // Indispensable pour Nginx
    }
  });
}
