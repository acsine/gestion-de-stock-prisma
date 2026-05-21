import type { NextAuthConfig } from "next-auth";

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET || "f6e7d8c9b0a1a2b3c4d5e6f7g8h9i0j1";
}

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { 
    strategy: "jwt",
    maxAge: 3600, // 1 heure (3600 secondes) maximum de session
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized() {
      return true; // Let middleware.ts handle all redirection logic
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.isSuperAdmin = (user as any).isSuperAdmin;
        token.canDownload = (user as any).canDownload;
        token.permissions = (user as any).permissions;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.isActive = (user as any).isActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).isSuperAdmin = token.isSuperAdmin;
        (session.user as any).canDownload = token.canDownload;
        (session.user as any).permissions = token.permissions || [];
        (session.user as any).mustChangePassword = token.mustChangePassword;
        (session.user as any).isActive = token.isActive;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
