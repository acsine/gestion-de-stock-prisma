import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Get the raw body text for signature validation
    const bodyText = await req.text();
    const signature = req.headers.get("x-paayit-signature");
    const secret = process.env.PAAYIT_WEBHOOK_SECRET;

    if (!signature || !secret) {
      console.warn("[PAAYIT WEBHOOK] Missing signature or webhook secret");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Validate HMAC-SHA256 signature
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(bodyText)
      .digest("hex");

    if (hmac !== signature) {
      console.error("[PAAYIT WEBHOOK] Invalid signature", { received: signature, computed: hmac });
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    // 3. Parse JSON payload
    const payload = JSON.parse(bodyText);
    console.log("[PAAYIT WEBHOOK] Valid webhook received:", payload);

    const { event, transaction_id, status } = payload;

    // We only process successful deposit updates
    if (event?.toLowerCase() === "transaction.updated" && status?.toLowerCase() === "success") {
      let reference = payload.reference;

      // Fallback: If reference is not in payload, query transaction details directly from Paayit
      if (!reference && transaction_id) {
        console.log(`[PAAYIT WEBHOOK] Reference not in webhook payload. Fetching details for tx: ${transaction_id}`);
        try {
          const apiKey = process.env.PAAYIT_API_KEY;
          if (apiKey) {
            const txResponse = await fetch(`https://api-paayit.servel.ink/api/v1/transactions/${transaction_id}`, {
              method: "GET",
              headers: {
                "X-API-Key": apiKey,
              },
            });

            if (txResponse.ok) {
              const txData = await txResponse.json();
              reference = txData.reference;
              console.log(`[PAAYIT WEBHOOK] Fetched transaction details. Reference is: ${reference}`);
            } else {
              console.error(
                `[PAAYIT WEBHOOK] Failed to fetch transaction ${transaction_id} from Paayit API:`,
                await txResponse.text()
              );
            }
          } else {
            console.error("[PAAYIT WEBHOOK] PAAYIT_API_KEY is not defined. Cannot query transaction.");
          }
        } catch (err) {
          console.error("[PAAYIT WEBHOOK] Error fetching transaction from Paayit API:", err);
        }
      }

      // Validate reference format: LIC_tenantId_licenseId_timestamp
      if (!reference || !reference.startsWith("LIC_")) {
        console.error(`[PAAYIT WEBHOOK] Reference is missing or invalid: ${reference}`);
        return NextResponse.json({ error: "Référence invalide ou manquante" }, { status: 400 });
      }

      const parts = reference.split("_");
      if (parts.length < 4) {
        console.error(`[PAAYIT WEBHOOK] Reference format is invalid: ${reference}`);
        return NextResponse.json({ error: "Format de référence invalide" }, { status: 400 });
      }

      const tenantId = parts[1];
      const licenseId = parts[2];

      console.log(`[PAAYIT WEBHOOK] Activating license ${licenseId} for tenant ${tenantId}`);

      // Retrieve license details
      const license = await prisma.license.findUnique({
        where: { id: licenseId },
      });

      if (!license) {
        console.error(`[PAAYIT WEBHOOK] License ${licenseId} not found in database`);
        return NextResponse.json({ error: "Licence introuvable" }, { status: 404 });
      }

      // Update tenant subscription status
      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: "ACTIVE",
          licenseId: license.id,
          subscriptionActive: true,
          trialEndsAt: new Date(Date.now() + license.durationDays * 24 * 60 * 60 * 1000),
        },
      });

      // Activate all users in this tenant
      await prisma.user.updateMany({
        where: { tenantId },
        data: { isActive: true },
      });

      console.log(`[PAAYIT WEBHOOK SUCCESS] Tenant ${updatedTenant.name} is now ACTIVE on plan ${license.name}`);

      return NextResponse.json({ success: true, message: "Licence activée avec succès" });
    }

    // Return 200 for ignored events/statuses to satisfy webhook caller
    return NextResponse.json({ success: true, message: "Événement ignoré" });
  } catch (error: any) {
    console.error("[PAAYIT WEBHOOK CATCH ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Une erreur interne est survenue dans le traitement du webhook" },
      { status: 500 }
    );
  }
}
