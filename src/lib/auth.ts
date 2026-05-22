import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { z } from "zod";
import { authConfig } from "./auth.config";

// Accepts either email or full phone (e.g. "+237699123456")
const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        login: { label: "Email ou Téléphone", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            console.error("[Auth] Invalid input:", parsed.error.format());
            return null;
          }

          const { login, password } = parsed.data;
          const loginValue = login.trim().toLowerCase();

          console.log("[Auth] Attempting login for:", loginValue);

          // Try to find user by email first, then by phone
          let user = await prisma.user.findUnique({
            where: { email: loginValue },
            include: {
              role: { include: { permissions: true } },
              tenant: { include: { license: true } },
            },
          });

          // If not found by email, try phone (stored as international format e.g. +237699...)
          if (!user) {
            user = await prisma.user.findUnique({
              where: { phone: loginValue },
              include: {
                role: { include: { permissions: true } },
                tenant: { include: { license: true } },
              },
            });
          }

          if (!user) {
            console.warn("[Auth] User not found:", loginValue);
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.passwordHash);
          console.log("[Auth] Password match result:", passwordMatch);

          if (!passwordMatch) {
            console.warn("[Auth] Password mismatch for:", loginValue);
            return null;
          }

          // Self-heal mechanism for roles & permissions
          let needsRefetch = false;

          // 1. If ADMIN role has empty permissions, connect all global permissions
          if (user.role?.name === "ADMIN" && (!user.role.permissions || user.role.permissions.length === 0)) {
            console.log("[Auth Self-Heal] ADMIN role has empty permissions. Fixing...");
            const allPermissions = await prisma.permission.findMany();
            if (allPermissions.length > 0) {
              await prisma.role.update({
                where: { id: user.role.id },
                data: {
                  permissions: {
                    connect: allPermissions.map((p) => ({ id: p.id })),
                  },
                },
              });
              needsRefetch = true;
              console.log("[Auth Self-Heal] Successfully associated all permissions to ADMIN role.");
            }
          }

          // 2. If user is a tenant admin or regular user with a null roleId, assign/create ADMIN role
          if (!user.isSuperAdmin && !user.roleId && user.tenantId) {
            console.log("[Auth Self-Heal] Tenant user has no role. Assigning ADMIN role...");
            let adminRole = await prisma.role.findFirst({
              where: { tenantId: user.tenantId, name: "ADMIN" },
            });

            if (!adminRole) {
              const allPermissions = await prisma.permission.findMany();
              adminRole = await prisma.role.create({
                data: {
                  name: "ADMIN",
                  tenantId: user.tenantId,
                  description: "Administrateur de l'entreprise",
                  permissions: {
                    connect: allPermissions.map((p) => ({ id: p.id })),
                  },
                },
              });
            }

            await prisma.user.update({
              where: { id: user.id },
              data: { roleId: adminRole.id },
            });
            needsRefetch = true;
            console.log("[Auth Self-Heal] Assigned ADMIN role to user.");
          }

          if (needsRefetch) {
            const updatedUser = await prisma.user.findUnique({
              where: { id: user.id },
              include: {
                role: { include: { permissions: true } },
                tenant: { include: { license: true } },
              },
            });
            if (updatedUser) {
              user = updatedUser;
            }
          }

          const canDownload =
            user.isSuperAdmin || user.tenant?.license?.canDownload || false;

          return {
            id: user.id,
            tenantId: user.tenantId,
            isSuperAdmin: user.isSuperAdmin,
            canDownload,
            name: user.name,
            email: user.email,
            role: user.role?.name || "VENDEUR",
            permissions: user.role?.permissions?.map((p) => p.code) || [],
            mustChangePassword: user.mustChangePassword,
            isActive: user.isActive,
            allowedCashAccountId: user.allowedCashAccountId,
          };
        } catch (error) {
          console.error("[Auth] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
});
