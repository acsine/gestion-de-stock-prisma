import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { z } from "zod";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            console.error("[Auth] Invalid input:", parsed.error.format());
            return null;
          }

          console.log("[Auth] Attempting login for:", parsed.data.email);
          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email.toLowerCase() }, // Force lowercase search
            include: { 
              role: { include: { permissions: true } },
              tenant: { include: { license: true } }
            }
          });

          if (!user) {
            console.warn("[Auth] User not found:", parsed.data.email);
            return null;
          }

          const passwordMatch = await bcrypt.compare(
            parsed.data.password,
            user.passwordHash
          );
          
          console.log("[Auth] Password match result:", passwordMatch);
          
          if (!passwordMatch) {
            console.warn("[Auth] Password mismatch for:", parsed.data.email);
            return null;
          }

          const canDownload = user.isSuperAdmin || user.tenant?.license?.canDownload || false;

          return {
            id: user.id,
            tenantId: user.tenantId,
            isSuperAdmin: user.isSuperAdmin,
            canDownload,
            name: user.name,
            email: user.email,
            role: user.role?.name || "VENDEUR",
            permissions: user.role?.permissions?.map(p => p.code) || [],
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
