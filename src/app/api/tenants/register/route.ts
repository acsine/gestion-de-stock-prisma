import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyName, adminName, adminEmail, adminPassword } = body;

    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    // 1. Vérifier si l'entreprise ou l'email existe déjà
    const existingTenant = await prisma.tenant.findUnique({ where: { email: adminEmail } });
    if (existingTenant) return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });

    const slug = companyName.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");

    // 2. Créer le Tenant et l'Utilisateur Admin dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer le tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          email: adminEmail,
          slug,
          status: "PENDING",
        },
      });

      // Créer un rôle ADMIN par défaut pour ce tenant
      const adminRole = await tx.role.create({
        data: {
          name: "ADMIN",
          tenantId: tenant.id,
          description: "Administrateur de l'entreprise",
        },
      });

      // Créer l'utilisateur admin
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const user = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          tenantId: tenant.id,
          roleId: adminRole.id,
          isActive: false, // Inactif jusqu'à validation du tenant
        },
      });

      return { tenant, user };
    });

    return NextResponse.json({ 
      success: true, 
      message: "Votre demande d'inscription a été envoyée. Un administrateur validera votre compte prochainement." 
    }, { status: 201 });

  } catch (error: any) {
    console.error("[TENANT REGISTER ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
