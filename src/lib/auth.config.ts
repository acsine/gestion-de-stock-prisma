import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { 
    strategy: "jwt",
    maxAge: 3600, // 1 heure (3600 secondes) maximum de session
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
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
