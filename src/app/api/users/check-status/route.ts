import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ active: false, authenticated: false });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isActive: true, isSuperAdmin: true }
    });

    const active = dbUser?.isActive || dbUser?.isSuperAdmin || false;

    return NextResponse.json({
      active,
      authenticated: true
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
