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

          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
            include: { role: { include: { permissions: true } } }
          });

          if (!user || !user.isActive) {
            console.warn("[Auth] User not found or inactive:", parsed.data.email);
            return null;
          }

          const passwordMatch = await bcrypt.compare(
            parsed.data.password,
            user.passwordHash
          );
          if (!passwordMatch) {
            console.warn("[Auth] Password mismatch for:", parsed.data.email);
            return null;
          }

          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLogin: new Date() },
            });
          } catch (e) {
            console.error("[Auth] Failed to update lastLogin:", e);
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role?.name || "VENDEUR",
            permissions: user.role?.permissions?.map(p => p.code) || [],
            mustChangePassword: user.mustChangePassword,
          };
        } catch (error) {
          console.error("[Auth] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
});
