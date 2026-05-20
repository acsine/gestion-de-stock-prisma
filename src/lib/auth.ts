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
          };
        } catch (error) {
          console.error("[Auth] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
});
