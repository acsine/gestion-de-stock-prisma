// src/lib/permissions.ts
import { auth } from "@/lib/auth";

export async function hasPermission(permissionCode: string) {
  const session = await auth();
  if (!session) return false;
  
  const user = session.user as any;
  if (user.isSuperAdmin) return true;
  if (user.role === "ADMIN") return true;
  
  const permissions = user.permissions || [];
  return permissions.includes(permissionCode);
}

export async function checkPermission(permissionCode: string) {
  const allowed = await hasPermission(permissionCode);
  if (!allowed) {
    throw new Error("Permission refusée");
  }
}
