// src/middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // 1. Define Public Paths
  const isPublicPath = pathname.startsWith("/login") || pathname.startsWith("/api/auth");

  // 2. Handle Logged-in Users on Public Paths
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 3. Allow Public Paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 4. Protect All Other Paths
  if (!isLoggedIn) {
    // If it's an API route, return 401 instead of redirecting to login
    if (pathname.startsWith("/api")) {
      return new NextResponse(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
