// src/app/api/setup/config/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const email = session.user.email;
    // La variable DATABASE_URL de l'instance en ligne constitue l'URL cloud pour l'installateur local.
    const cloudDbUrl = process.env.DATABASE_URL || "";

    const configData = {
      email,
      cloud_database_url: cloudDbUrl,
      app_name: "ThaborSolution Stock Manager",
      downloaded_at: new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(configData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="setup_config.json"',
      },
    });
  } catch (error: any) {
    console.error("[API_SETUP_CONFIG_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
