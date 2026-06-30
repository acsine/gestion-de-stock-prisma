// src/app/api/licenses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — fetches all available licenses for the pricing page
export async function GET() {
  try {
    const licenses = await prisma.license.findMany({
      orderBy: { price: "asc" }
    });
    return NextResponse.json(licenses);
  } catch (error: any) {
    console.error("[API_LICENSES] Error:", error.message);
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 });
  }
}
