// src/lib/validations/index.ts
import { z } from "zod";

// =====================
// PRODUCT SCHEMAS
// =====================
export const productSchema = z.object({
  sku: z.string().min(2, "SKU requis (min 2 caractères)"),
  name: z.string().min(2, "Nom requis"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Catégorie requise"),
  supplierId: z.string().optional(),
  buyPrice: z.number().positive("Prix d'achat doit être positif"),
  sellPrice: z.number().positive("Prix de vente doit être positif"),
  taxRate: z.number().min(0).max(100),
  unit: z.string(),
  location: z.string().optional(),
  barcode: z.string().optional(),
  minStock: z.number().min(0),
  maxStock: z.number().min(0),
  imageUrl: z.string().optional(),
  status: z.enum(["ACTIF", "INACTIF", "ARCHIVE"]),
});

export type ProductInput = z.infer<typeof productSchema>;

// =====================
// CATEGORY SCHEMAS
// =====================
export const categorySchema = z.object({
  name: z.string().min(2, "Nom requis"),
  slug: z.string().min(2, "Slug requis").optional(),
  parentId: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// =====================
// STOCK MOVEMENT SCHEMAS
// =====================
export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  type: z.enum([
    "ENTREE_ACHAT", "ENTREE_RETOUR", "ENTREE_AJUSTEMENT",
    "SORTIE_VENTE", "SORTIE_USAGE_INTERNE", "SORTIE_PERTE",
    "SORTIE_RETOUR_FOURNISSEUR", "AJUSTEMENT_INVENTAIRE"
  ]),
  quantity: z.number().positive("Quantité doit être positive"),
  reason: z.string().optional(),
  reference: z.string().optional(),
  unitPrice: z.number().min(0).optional(),
  note: z.string().optional(),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;

// =====================
// INVOICE SCHEMAS
// =====================
export const invoiceItemSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  description: z.string().optional(),
  quantity: z.number().positive("Quantité positive requise"),
  unitPrice: z.number().min(0, "Prix unitaire requis"),
  taxRate: z.number().min(0).max(100),
  discount: z.number().min(0).max(100),
});

export const invoiceSchema = z.object({
  type: z.enum(["FACTURE", "PROFORMA", "AVOIR", "DEVIS"]),
  customerId: z.string().min(1, "Client requis"),
  discount: z.number().min(0).max(100),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Au moins un article requis"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

// =====================
// PURCHASE ORDER SCHEMAS
// =====================
export const orderItemSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  quantity: z.number().positive("Quantité positive requise"),
  unitPrice: z.number().min(0, "Prix unitaire requis"),
  taxRate: z.number().min(0).max(100),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Fournisseur requis"),
  notes: z.string().optional(),
  expectedAt: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Au moins un article requis"),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

// =====================
// CUSTOMER SCHEMAS
// =====================
export const customerSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  type: z.enum(["PARTICULIER", "ENTREPRISE", "GROSSISTE"]),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  taxId: z.string().optional(),
  rccm: z.string().optional(),
  discount: z.number().min(0).max(100),
  creditLimit: z.number().min(0),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

// =====================
// SUPPLIER SCHEMAS
// =====================
export const supplierSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.number().min(0),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

// =====================
// EMPLOYEE SCHEMAS
// =====================
export const employeeSchema = z.object({
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  dateOfBirth: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional(),
  position: z.string().min(2, "Poste requis (min 2 caractères)"),
  department: z.string().nullable().optional(),
  contractType: z.enum(["CDI", "CDD", "STAGE", "FREELANCE"]),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().nullable().optional(),
  baseSalary: z.number().positive("Salaire de base doit être positif"),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

// =====================
// TRANSACTION SCHEMAS
// =====================
export const transactionSchema = z.object({
  type: z.enum(["RECETTE", "DEPENSE"]),
  amount: z.number().positive("Montant doit être positif"),
  category: z.string().min(1, "Catégorie requise"),
  accountId: z.string().min(1, "Compte requis"),
  reference: z.string().optional(),
  supplierId: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

// =====================
// USER SCHEMAS
// =====================
export const userSchema = z.object({
  employeeId: z.string().min(1, "Employé requis"),
  name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe: 8 caractères minimum").optional(),
  roleId: z.string().min(1, "Rôle requis"),
  allowedCashAccountId: z.string().optional().nullable(),
});

// =====================
// LOGIN SCHEMA (email or phone)
// =====================
export const loginSchema = z.object({
  loginType: z.enum(["email", "phone"]).default("email"),
  email: z.string().optional(),
  phoneDialCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().min(1, "Mot de passe requis"),
}).superRefine((data, ctx) => {
  if (data.loginType === "email") {
    if (!data.email || !z.string().email().safeParse(data.email).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Email invalide" });
    }
  } else {
    if (!data.phoneDialCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phoneDialCode"], message: "Code pays requis" });
    }
    if (!data.phoneNumber || data.phoneNumber.trim().length < 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phoneNumber"], message: "Numéro de téléphone requis" });
    }
  }
});

export type LoginInput = z.infer<typeof loginSchema>;

// =====================
// REGISTER COMPANY SCHEMA
// =====================
export const registerCompanySchema = z.object({
  // Step 1 - Company
  companyName: z.string().min(2, "Nom de l'entreprise requis (min 2 caractères)"),
  companyPhone: z.string().min(5, "Numéro de téléphone requis"),
  companyAddress: z.string().optional(),
  companyLogo: z.string().optional(),
  // Step 2 - Admin
  adminName: z.string().min(2, "Nom complet requis"),
  adminEmail: z.string().email("Email invalide"),
  adminPassword: z.string().min(8, "Mot de passe: 8 caractères minimum"),
});

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;

