import prisma from "./prisma";

export async function logActivity({
  userId,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
  ip,
  userAgent,
}: {
  userId: string;
  action: string; // e.g. "CREATE", "UPDATE", "DELETE", "LOGIN", etc.
  entity: string; // e.g. "Product", "Employee", "Invoice", etc.
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ip?: string;
  userAgent?: string;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}
