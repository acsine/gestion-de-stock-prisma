// src/app/api/users/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { password } = await req.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit comporter au moins 8 caractères." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ message: "Mot de passe mis à jour avec succès." });
  } catch (error: any) {
    console.error("[CHANGE_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de la mise à jour." }, { status: 500 });
  }
}
