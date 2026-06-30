import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Check if user is superadmin
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true }
    });

    if (!dbUser || !dbUser.isSuperAdmin) {
      return NextResponse.json({ error: "Interdit — Réservé aux super-administrateurs" }, { status: 403 });
    }

    // 3. Forward request to Paayit
    const apiKey = process.env.PAAYIT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API Paayit non configurée" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") || "20";
    const offset = searchParams.get("offset") || "0";
    const status = searchParams.get("status") || "";

    let url = `https://api-paayit.servel.ink/api/v1/transactions?limit=${limit}&offset=${offset}`;
    if (status) {
      url += `&status=${status}`;
    }

    console.log(`[PAAYIT LOGS] Fetching logs from Paayit: limit=${limit}, offset=${offset}, status=${status}`);

    const paayitResponse = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
      },
    });

    if (!paayitResponse.ok) {
      const errorText = await paayitResponse.text();
      return NextResponse.json(
        { error: `Erreur API Paayit: ${errorText}` },
        { status: paayitResponse.status }
      );
    }

    const data = await paayitResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[PAAYIT LOGS GET ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
