"use client";
// src/app/(dashboard)/factures/page.tsx
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useInvoices } from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency, formatDate, getInvoiceStatusBadge, getInvoiceStatusLabel, downloadReport } from "@/lib/utils";
import { useTranslation } from "@/locales/i18n";
import { FileText, Plus, Download, Search, RefreshCw, Printer, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";

export default function FacturesPage() {
  const { t, language } = useTranslation();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const term = searchParams?.get("search") || "";
    setSearch(term);
  }, [searchParams]);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { addToast } = useUIStore();

  const { data, isLoading, isFetching, refetch } = useInvoices({ search, status: statusFilter, type: typeFilter });
  const invoices = data?.data || [];

  const handleDownload = async (invoiceId: string, format: "pdf" | "word", number: string) => {
    const key = `${invoiceId}-${format}`;
    setLoading(s => ({ ...s, [key]: true }));
    try {
      await downloadReport({ type: "invoice", format, invoiceId }, `facture-${number}`);
      addToast({
        type: "success",
        title: language === "fr" 
          ? `Facture téléchargée (${format.toUpperCase()})` 
          : `Invoice downloaded (${format.toUpperCase()})`
      });
    } catch {
      addToast({
        type: "error",
        title: language === "fr" ? "Erreur de téléchargement" : "Download error"
      });
    } finally {
      setLoading(s => ({ ...s, [key]: false }));
    }
  };

  const handleBulkExport = async (format: string) => {
    try {
      await downloadReport({ type: "invoices", format }, "rapport-factures");
      addToast({
        type: "success",
        title: language === "fr" ? "Export terminé" : "Export completed"
      });
    } catch {
      addToast({
        type: "error",
        title: language === "fr" ? "Erreur d'export" : "Export error"
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.nav.invoices}</h1>
          <p className="text-gray-500 text-sm">
            {data?.total || 0} {language === "fr" ? "document(s)" : "document(s)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setLoading(s => ({ ...s, 'bulk-excel': true }));
              handleBulkExport("excel").finally(() => setLoading(s => ({ ...s, 'bulk-excel': false })));
            }} 
            disabled={loading['bulk-excel']}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {loading['bulk-excel'] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Excel
          </button>
          <Link href="/factures/nouvelle" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> {language === "fr" ? "Nouvelle facture" : "New invoice"}
          </Link>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder={language === "fr" ? "Rechercher par N° ou client…" : "Search by N° or customer…"} 
            className="input pl-9" 
          />
        </div>
        <SearchableSelect
          options={[
            { value: "FACTURE", label: language === "fr" ? "Facture" : "Invoice" },
            { value: "PROFORMA", label: "Pro-forma" },
            { value: "AVOIR", label: language === "fr" ? "Avoir" : "Credit Note" },
            { value: "DEVIS", label: language === "fr" ? "Devis" : "Quote" }
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder={language === "fr" ? "Tous types" : "All types"}
          allowAll
          allLabel={language === "fr" ? "Tous types" : "All types"}
          className="w-48"
        />
        <SearchableSelect
          options={[
            { value: "BROUILLON", label: language === "fr" ? "Brouillon" : "Draft" },
            { value: "ENVOYE", label: language === "fr" ? "Envoyé" : "Sent" },
            { value: "PARTIELLEMENT_PAYE", label: language === "fr" ? "Part. payé" : "Part. paid" },
            { value: "PAYE", label: language === "fr" ? "Payé" : "Paid" },
            { value: "ANNULE", label: language === "fr" ? "Annulé" : "Cancelled" }
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder={language === "fr" ? "Tous statuts" : "All statuses"}
          allowAll
          allLabel={language === "fr" ? "Tous statuts" : "All statuses"}
          className="w-48"
        />
        <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{language === "fr" ? "N° Document" : "Document N°"}</th>
              <th>{language === "fr" ? "Type" : "Type"}</th>
              <th>{t.invoices.table.customer}</th>
              <th>{t.invoices.table.date}</th>
              <th>{language === "fr" ? "Échéance" : "Due Date"}</th>
              <th>{t.invoices.table.total}</th>
              <th>{t.invoices.table.paid}</th>
              <th>{t.invoices.table.due}</th>
              <th>{t.invoices.table.status}</th>
              <th>{t.actions.actions}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={10} />
            ) : invoices.length === 0 ? (
              <TableEmpty colSpan={10} message={language === "fr" ? "Aucune facture trouvée" : "No invoices found"} icon={FileText} />
            ) : invoices.map((inv: any) => (
              <tr key={inv.id}>
                <td className="font-mono font-medium text-blue-700">{inv.number}</td>
                <td>
                  <span className="badge-blue text-xs">
                    {inv.type === "FACTURE" 
                      ? (language === "fr" ? "Facture" : "Invoice") 
                      : inv.type === "AVOIR" 
                        ? (language === "fr" ? "Avoir" : "Credit Note") 
                        : inv.type === "DEVIS" 
                          ? (language === "fr" ? "Devis" : "Quote") 
                          : inv.type}
                  </span>
                </td>
                <td className="font-medium">{inv.customer?.name}</td>
                <td className="text-gray-500 text-xs">{formatDate(inv.issueDate)}</td>
                <td className="text-xs">{inv.dueDate ? <span className="text-orange-600">{formatDate(inv.dueDate)}</span> : "—"}</td>
                <td className="font-semibold text-right">{formatCurrency(inv.total)}</td>
                <td className="text-right text-green-700">{formatCurrency(inv.paidAmount)}</td>
                <td className="text-right text-orange-700 font-medium">{formatCurrency(inv.total - inv.paidAmount)}</td>
                <td>
                  <span className={`text-xs ${getInvoiceStatusBadge(inv.status)}`}>
                    {language === "fr" 
                      ? getInvoiceStatusLabel(inv.status) 
                      : (inv.status === "BROUILLON" 
                          ? "Draft" 
                          : inv.status === "ENVOYE" 
                            ? "Sent" 
                            : inv.status === "PARTIELLEMENT_PAYE" 
                              ? "Part. paid" 
                              : inv.status === "PAYE" 
                                ? "Paid" 
                                : inv.status === "ANNULE" 
                                  ? "Cancelled" 
                                  : "Expired")}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button 
                      title={language === "fr" ? "Imprimer PDF" : "Print PDF"} 
                      onClick={() => handleDownload(inv.id, "pdf", inv.number)} 
                      disabled={loading[`${inv.id}-pdf`]}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors disabled:opacity-50"
                    >
                      {loading[`${inv.id}-pdf`] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      title={language === "fr" ? "Voir les détails" : "View details"}
                      onClick={() => {
                        setLoading(s => ({ ...s, [`${inv.id}-view`]: true }));
                        router.push(`/factures/${inv.id}`);
                      }}
                      disabled={loading[`${inv.id}-view`]}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors disabled:opacity-50"
                    >
                      {loading[`${inv.id}-view`] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
