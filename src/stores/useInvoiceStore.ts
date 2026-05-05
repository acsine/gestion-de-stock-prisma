// src/stores/useInvoiceStore.ts
import { create } from "zustand";
import type { InvoiceItem, Product } from "@/types";

interface CartItem extends InvoiceItem {
  product: Product;
}

interface InvoiceStore {
  items: CartItem[];
  customerId: string;
  discount: number;
  type: "FACTURE" | "PROFORMA" | "AVOIR" | "DEVIS";
  notes: string;

  setCustomerId: (id: string) => void;
  setType: (type: "FACTURE" | "PROFORMA" | "AVOIR" | "DEVIS") => void;
  setDiscount: (discount: number) => void;
  setNotes: (notes: string) => void;

  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateItemQty: (productId: string, qty: number) => void;
  updateItemPrice: (productId: string, price: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;

  subtotal: () => number;
  taxAmount: () => number;
  total: () => number;
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  items: [],
  customerId: "",
  discount: 0,
  type: "FACTURE",
  notes: "",

  setCustomerId: (id) => set({ customerId: id }),
  setType: (type) => set({ type }),
  setDiscount: (discount) => set({ discount }),
  setNotes: (notes) => set({ notes }),

  addItem: (product, qty = 1) => {
    const existing = get().items.find((i) => i.productId === product.id);
    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.unitPrice }
            : i
        ),
      }));
    } else {
      const item: CartItem = {
        productId: product.id,
        product,
        quantity: qty,
        unitPrice: product.sellPrice,
        taxRate: product.taxRate,
        discount: 0,
        total: qty * product.sellPrice,
      };
      set((s) => ({ items: [...s.items, item] }));
    }
  },

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

  updateItemQty: (productId, qty) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: qty, total: qty * i.unitPrice * (1 - i.discount / 100) }
          : i
      ),
    })),

  updateItemPrice: (productId, price) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.productId === productId
          ? { ...i, unitPrice: price, total: i.quantity * price * (1 - i.discount / 100) }
          : i
      ),
    })),

  updateItemDiscount: (productId, discount) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.productId === productId
          ? { ...i, discount, total: i.quantity * i.unitPrice * (1 - discount / 100) }
          : i
      ),
    })),

  clearCart: () =>
    set({ items: [], customerId: "", discount: 0, notes: "", type: "FACTURE" }),

  subtotal: () => {
    const { items, discount } = get();
    const raw = items.reduce((sum, i) => sum + i.total, 0);
    return raw * (1 - discount / 100);
  },

  taxAmount: () => {
    const { items, discount } = get();
    return items.reduce((sum, i) => {
      const lineTotal = i.total * (1 - discount / 100);
      return sum + lineTotal * (i.taxRate / 100);
    }, 0);
  },

  total: () => get().subtotal() + get().taxAmount(),
}));
