// src/hooks/useInvoices.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Invoice, ApiResponse } from "@/types";
import type { InvoiceInput, CustomerInput } from "@/lib/validations";

export function useInvoices(params?: { search?: string; status?: string; type?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.type) query.set("type", params.type);
  if (params?.page) query.set("page", String(params.page));

  return useQuery<ApiResponse<Invoice[]>>({
    queryKey: ["invoices", params],
    queryFn: () => fetch(`/api/invoices?${query}`).then((r) => r.json()),
  });
}

export function useInvoice(id: string) {
  return useQuery<ApiResponse<Invoice>>({
    queryKey: ["invoices", id],
    queryFn: () => fetch(`/api/invoices/${id}`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvoiceInput) =>
      fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, amount, method, reference }: { invoiceId: string; amount: number; method: string; reference?: string }) =>
      fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method, reference }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

// src/hooks/useStock.ts - inlined below
export function useStockMovements(params?: { productId?: string; type?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.productId) query.set("productId", params.productId);
  if (params?.type) query.set("type", params.type);
  if (params?.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["stock", params],
    queryFn: () => fetch(`/api/stock?${query}`).then((r) => r.json()),
  });
}

export function useCreateStockMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetch("/api/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

// Employees
export function useEmployees(params?: { search?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);

  return useQuery({
    queryKey: ["employees", params],
    queryFn: () => fetch(`/api/employees?${query}`).then((r) => r.json()),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

// Payroll
export function usePayrolls(params?: { month?: number; year?: number }) {
  const query = new URLSearchParams();
  if (params?.month) query.set("month", String(params.month));
  if (params?.year) query.set("year", String(params.year));

  return useQuery({
    queryKey: ["payrolls", params],
    queryFn: () => fetch(`/api/payroll?${query}`).then((r) => r.json()),
  });
}

export function useGeneratePayrolls() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      fetch("/api/payroll/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, year }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payrolls"] }),
  });
}

// Finance
export function useTransactions(params?: { type?: string; accountId?: string; startDate?: string; endDate?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.accountId) query.set("accountId", params.accountId);
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  if (params?.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["transactions", params],
    queryFn: () => fetch(`/api/finances?${query}`).then((r) => r.json()),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetch("/api/finances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useCashAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetch("/api/finances/accounts").then((r) => r.json()),
  });
}

// Alerts
export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetch("/api/alerts").then((r) => r.json()),
    refetchInterval: 5000, // Very frequent for alerts
  });
}

// Dashboard
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
    refetchInterval: 10000,
  });
}

// Customers
export function useCustomers(params?: { search?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => fetch(`/api/customers?${query}`).then((r) => r.json()),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CustomerInput) => {
      const r = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || "Erreur de création");
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerInput> }) => {
      const r = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || "Erreur de mise à jour");
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || "Erreur de suppression");
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

// Suppliers
export function useSuppliers(params?: { search?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => fetch(`/api/suppliers?${query}`).then((r) => r.json()),
  });
}

// Categories
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/categories/${id}`, { method: "DELETE" }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Erreur de suppression");
      }
      return r.json();
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// Purchase orders
export function usePurchaseOrders(params?: { status?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => fetch(`/api/orders?${query}`).then((r) => r.json()),
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useReceiveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/orders/${id}/receive`, {
        method: "POST",
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// Roles & Permissions
export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => fetch("/api/roles").then((r) => r.json()),
  });
}

export function usePermissionsList() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => fetch("/api/permissions").then((r) => r.json()),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useSeedPermissions() {
  return useMutation({
    mutationFn: () => fetch("/api/permissions", { method: "POST" }).then((r) => r.json()),
  });
}

// Settings
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });
}
