// src/types/index.ts
export type Role = "ADMIN" | "GESTIONNAIRE_STOCK" | "COMPTABLE" | "VENDEUR" | "RH" | "AUDITEUR";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  color?: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  _count?: { products: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  category: Category;
  supplierId?: string;
  supplier?: Supplier;
  buyPrice: number;
  sellPrice: number;
  taxRate: number;
  unit: string;
  location?: string;
  imageUrl?: string;
  barcode?: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  status: "ACTIF" | "INACTIF" | "ARCHIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  balance: number;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  type: "PARTICULIER" | "ENTREPRISE" | "GROSSISTE";
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  discount: number;
  balance: number;
  isActive: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  product: Product;
  type: string;
  quantity: number;
  reason?: string;
  reference?: string;
  unitPrice?: number;
  userId: string;
  user: User;
  note?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id?: string;
  productId: string;
  product?: Product;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  type: "FACTURE" | "PROFORMA" | "AVOIR" | "DEVIS";
  status: "BROUILLON" | "ENVOYE" | "PARTIELLEMENT_PAYE" | "PAYE" | "ANNULE" | "EXPIRE";
  customerId: string;
  customer: Customer;
  discount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  dueDate?: string;
  notes?: string;
  issueDate: string;
  items: InvoiceItem[];
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplier: Supplier;
  status: "BROUILLON" | "ENVOYE" | "PARTIELLEMENT_RECU" | "RECU" | "ANNULE";
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  expectedAt?: string;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id?: string;
  productId: string;
  product?: Product;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone?: string;
  email?: string;
  position: string;
  department?: string;
  contractType: "CDI" | "CDD" | "STAGE" | "FREELANCE";
  startDate: string;
  baseSalary: number;
  status: "ACTIF" | "CONGE" | "SUSPENDU" | "LICENCIE";
  createdAt: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  employee: Employee;
  month: number;
  year: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  socialCharges: number;
  netSalary: number;
  status: "BROUILLON" | "VALIDE" | "PAYE";
  paidAt?: string;
}

export interface Transaction {
  id: string;
  type: "RECETTE" | "DEPENSE";
  amount: number;
  category: string;
  accountId: string;
  reference?: string;
  description?: string;
  date: string;
  createdAt: string;
}

export interface CashAccount {
  id: string;
  name: string;
  type: "CAISSE" | "BANQUE" | "MOBILE_MONEY";
  balance: number;
  currency: string;
}

export interface Alert {
  id: string;
  productId: string;
  product: Product;
  type: "STOCK_BAS" | "STOCK_CRITIQUE" | "RUPTURE" | "SURSTOCK" | "PEREMPTION";
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  alertCount: number;
  ruptures: number;
  totalStockValue: number;
  monthRevenue: number;
  monthExpenses: number;
  monthProfit: number;
  pendingInvoices: number;
  todayInvoices: number;
  todaySales: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  recentMovements: StockMovement[];
  recentInvoices: Invoice[];
  monthlyRevenue: { month: string; revenue: number; expenses: number }[];
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
