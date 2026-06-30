import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session || !(session.user as any)?.tenantId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const tenantId = (session.user as any).tenantId;

    // 2. Parse request body
    const { licenseId, licenseName, phoneNumber, service } = await req.json();

    if ((!licenseId && !licenseName) || !phoneNumber || !service) {
      return NextResponse.json(
        { error: "Paramètres manquants (licenseId ou licenseName, phoneNumber, service requis)" },
        { status: 400 }
      );
    }

    if (service !== "MTN" && service !== "ORANGE") {
      return NextResponse.json(
        { error: "Service invalide. Doit être 'MTN' ou 'ORANGE'." },
        { status: 400 }
      );
    }

    // 3. Find license
    const license = licenseId
      ? await prisma.license.findUnique({ where: { id: licenseId } })
      : await prisma.license.findUnique({ where: { name: licenseName } });

    if (!license) {
      return NextResponse.json(
        { error: "Licence introuvable en base de données" },
        { status: 404 }
      );
    }

    if (license.price <= 0) {
      return NextResponse.json(
        { error: "Cette formule est gratuite et ne requiert pas de paiement" },
        { status: 400 }
      );
    }

    // 4. Format phone number for Cameroon (Paayit expects e.g. +2376xxxxxxxx)
    let formattedPhone = phoneNumber.trim().replace(/\s+/g, "");
    
    // Remove leading '+' for processing if any, but ensure final has '+'
    if (formattedPhone.startsWith("+")) {
      // already has plus, ensure it has country code
      if (!formattedPhone.startsWith("+237")) {
        return NextResponse.json(
          { error: "Le numéro doit être au format Camerounais (+237...)" },
          { status: 400 }
        );
      }
    } else {
      // Local format, e.g. 6xxxxxxxx
      if (formattedPhone.length === 9) {
        formattedPhone = "+237" + formattedPhone;
      } else if (formattedPhone.startsWith("237") && formattedPhone.length === 12) {
        formattedPhone = "+" + formattedPhone;
      } else {
        return NextResponse.json(
          { error: "Le numéro de téléphone est invalide. Veuillez saisir 9 chiffres (ex: 677xxxxxx) ou inclure l'indicatif (+237...)" },
          { status: 400 }
        );
      }
    }

    // 5. Generate secure reference
    const reference = `LIC_${tenantId}_${license.id}_${Date.now()}`;

    // 6. Call Paayit API
    const apiKey = process.env.PAAYIT_API_KEY;
    if (!apiKey) {
      console.error("[PAAYIT INITIATE ERROR] PAAYIT_API_KEY is not defined in environment");
      return NextResponse.json(
        { error: "La passerelle de paiement Paayit n'est pas configurée sur le serveur" },
        { status: 500 }
      );
    }

    console.log(`[PAAYIT] Initiating deposit for tenant ${tenantId}, amount: ${license.price} XAF, phone: ${formattedPhone}, service: ${service}`);

    const paayitResponse = await fetch("https://api-paayit.servel.ink/api/v1/deposits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        amount: license.price,
        phone_number: formattedPhone,
        service: service,
        reference: reference,
      }),
    });

    const responseData = await paayitResponse.json();

    if (!paayitResponse.ok) {
      console.error("[PAAYIT API DEPOSIT ERROR]", responseData);
      return NextResponse.json(
        { error: responseData.message || "Erreur renvoyée par la passerelle de paiement Paayit" },
        { status: paayitResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: responseData,
    });
  } catch (error: any) {
    console.error("[PAAYIT INITIATE CATCH ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Une erreur interne est survenue lors de l'initiation du paiement" },
      { status: 500 }
    );
  }
}
