// src/lib/sync-config.ts

export const SYNCABLE_MODELS = [
  "role",
  "permission",
  "user",
  "category",
  "supplier",
  "customer",
  "product",
  "invoice",
  "invoiceItem",
  "purchaseOrder",
  "orderItem",
  "stockMovement",
  "payment",
  "cashAccount",
  "transaction",
  "employee",
  "payroll",
  "leave",
  "alert",
  "setting",
  "auditLog",
  "warehouse",
  "warehouseStock",
  "warehouseTransfer",
  "warehouseTransferItem",
  "ohadaAccount"
];

export type SyncableModel = typeof SYNCABLE_MODELS[number];
