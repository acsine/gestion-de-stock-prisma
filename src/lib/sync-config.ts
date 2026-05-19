// src/lib/sync-config.ts

export const SYNCABLE_MODELS = [
  "role",
  "permission",
  "user",
  "category",
  "supplier",
  "customer",
  "product",
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
  "setting"
];

export type SyncableModel = typeof SYNCABLE_MODELS[number];
