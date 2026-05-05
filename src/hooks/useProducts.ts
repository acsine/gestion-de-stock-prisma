// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, ApiResponse } from "@/types";
import type { ProductInput } from "@/lib/validations";

const API = "/api/products";

export function useProducts(params?: { search?: string; categoryId?: string; status?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.categoryId) query.set("categoryId", params.categoryId);
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));

  return useQuery<ApiResponse<Product[]>>({
    queryKey: ["products", params],
    queryFn: () => fetch(`${API}?${query}`).then((r) => r.json()),
  });
}

export function useProduct(id: string) {
  return useQuery<ApiResponse<Product>>({
    queryKey: ["products", id],
    queryFn: () => fetch(`${API}/${id}`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductInput) =>
      fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductInput> }) =>
      fetch(`${API}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`${API}/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useImportProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return fetch("/api/products/import", { method: "POST", body: form }).then((r) => r.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}
