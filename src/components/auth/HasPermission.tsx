"use client";
// src/components/auth/HasPermission.tsx
import { useSession } from "next-auth/react";
import React from "react";

interface HasPermissionProps {
  /** The permission code to check (e.g., 'products.create') */
  code?: string;
  /** Alternatively, check for multiple permissions (OR logic) */
  anyOf?: string[];
  /** Alternatively, check for multiple permissions (AND logic) */
  allOf?: string[];
  /** The content to show if the user has permission */
  children: React.ReactNode;
  /** Optional content to show if the user DOES NOT have permission */
  fallback?: React.ReactNode;
}

export function usePermissions() {
  const { data: session } = useSession();
  const rawRole = (session?.user as any)?.role;
  const role: string = typeof rawRole === 'string' ? rawRole : rawRole?.name || "";
  const permissions: string[] = (session?.user as any)?.permissions || [];
  const isSuper = (session?.user as any)?.isSuperAdmin || false;

  const hasPermission = (code: string) => {
    if (isSuper || role === "ADMIN") return true; // SuperAdmin and Admin have all permissions
    return permissions.includes(code);
  };

  const hasAnyPermission = (codes: string[]) => {
    if (isSuper || role === "ADMIN") return true;
    return codes.some((code) => permissions.includes(code));
  };

  const hasAllPermissions = (codes: string[]) => {
    if (isSuper || role === "ADMIN") return true;
    return codes.every((code) => permissions.includes(code));
  };

  return { permissions, role, hasPermission, hasAnyPermission, hasAllPermissions };
}

export function HasPermission({ code, anyOf, allOf, children, fallback = null }: HasPermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let allowed = false;
  if (code) allowed = hasPermission(code);
  else if (anyOf) allowed = hasAnyPermission(anyOf);
  else if (allOf) allowed = hasAllPermissions(allOf);
  else allowed = true; // If no code provided, allow by default? Or maybe deny? Let's say allow for now.

  if (!allowed) return fallback;

  return <>{children}</>;
}
