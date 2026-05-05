// src/lib/sync-config.ts

export const SYNCABLE_MODELS = [
  "category",
  "product",
  "supplier",
  "customer",
  "stockMovement",
  "invoice",
  "invoiceItem",
  "purchaseOrder",
  "orderItem",
  "payment",
  "cashAccount",
  "transaction",
  "employee",
  "payroll",
  "leave",
  "alert",
  "setting",
  "role",
  "permission",
  "user"
];

export type SyncableModel = typeof SYNCABLE_MODELS[number];
