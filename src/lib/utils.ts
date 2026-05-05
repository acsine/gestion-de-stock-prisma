// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "FCFA"): string {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString("fr-FR", options || { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getStockStatus(current: number, min: number, max: number) {
  if (current === 0) return { label: "Rupture", color: "red", class: "badge-red" };
  if (current <= min * 0.5) return { label: "Critique", color: "red", class: "badge-red" };
  if (current <= min) return { label: "Stock bas", color: "yellow", class: "badge-yellow" };
  if (current > max) return { label: "Surstock", color: "blue", class: "badge-blue" };
  return { label: "OK", color: "green", class: "badge-green" };
}

export function getInvoiceStatusBadge(status: string) {
  const map: Record<string, string> = {
    BROUILLON: "badge-gray", ENVOYE: "badge-blue",
    PARTIELLEMENT_PAYE: "badge-yellow", PAYE: "badge-green",
    ANNULE: "badge-red", EXPIRE: "badge-red",
  };
  return map[status] || "badge-gray";
}

export function getInvoiceStatusLabel(status: string) {
  const map: Record<string, string> = {
    BROUILLON: "Brouillon", ENVOYE: "Envoyé",
    PARTIELLEMENT_PAYE: "Part. payé", PAYE: "Payé",
    ANNULE: "Annulé", EXPIRE: "Expiré",
  };
  return map[status] || status;
}

export function downloadBlob(buffer: ArrayBuffer, filename: string, mimeType: string) {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadReport(params: Record<string, string>, filename: string) {
  const query = new URLSearchParams(params);
  const res = await fetch(`/api/reports?${query}`);
  if (!res.ok) {
    let errorMsg = "Erreur lors du téléchargement";
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }
  const buffer = await res.arrayBuffer();
  const ext = params.format === "pdf" ? "pdf" : params.format === "word" ? "docx" : "xlsx";
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  downloadBlob(buffer, `${filename}.${ext}`, mimeTypes[params.format] || mimeTypes.excel);
}

export const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
