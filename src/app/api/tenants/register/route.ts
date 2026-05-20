import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyName,
      companyPhone,
      companyAddress,
      companyLogo,
      adminName,
      adminEmail,
      adminPassword,
    } = body;

    // Validate required fields
    if (!companyName || !companyPhone || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis" },
        { status: 400 }
      );
    }

    // Validate & normalize phone number (must be in international format e.g. +237699123456)
    const parsedPhone = parsePhoneNumberFromString(companyPhone);
    if (!parsedPhone || !parsedPhone.isValid()) {
      return NextResponse.json(
        { error: "Numéro de téléphone invalide. Vérifiez le code pays et le numéro." },
        { status: 400 }
      );
    }
    const normalizedPhone = parsedPhone.format("E.164"); // e.g. "+237699123456"

    // Check if email already taken
    const existingByEmail = await prisma.tenant.findUnique({ where: { email: adminEmail } });
    if (existingByEmail) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    // Check if phone already taken
    const existingByPhone = await prisma.tenant.findUnique({ where: { phone: normalizedPhone } });
    if (existingByPhone) {
      return NextResponse.json({ error: "Ce numéro de téléphone est déjà utilisé par une autre entreprise" }, { status: 409 });
    }

    const slug = companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");

    // Create Tenant + Admin User in one transaction
    await prisma.$transaction(async (tx) => {
      // Create tenant with all fields
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          email: adminEmail,
          phone: normalizedPhone,
          address: companyAddress || null,
          logo: companyLogo || null,
          slug,
          status: "PENDING",
        },
      });

      // Create default ADMIN role
      const adminRole = await tx.role.create({
        data: {
          name: "ADMIN",
          tenantId: tenant.id,
          description: "Administrateur de l'entreprise",
        },
      });

      // Create admin user — also store phone so they can log in by phone
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          phone: normalizedPhone, // allows phone-based login
          passwordHash,
          tenantId: tenant.id,
          roleId: adminRole.id,
          isActive: false, // inactive until tenant is validated by super-admin
        },
      });

      return tenant;
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Votre demande d'inscription a été envoyée. Un administrateur validera votre compte prochainement.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[TENANT REGISTER ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
