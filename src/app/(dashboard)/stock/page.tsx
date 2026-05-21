"use client";
// src/app/(dashboard)/stock/page.tsx
import { useState, useEffect } from "react";
import { useStockMovements, useCreateStockMovement } from "@/hooks/useQueries";
import { useProducts } from "@/hooks/useProducts";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useTranslation } from "@/locales/i18n";
import { ArrowLeftRight, Plus, RefreshCw, ArrowUp, ArrowDown, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockMovementSchema, type StockMovementInput } from "@/lib/validations";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";
import { BarcodePrintModal, type BarcodePrintItem } from "@/components/ui/BarcodePrintModal";

function MovementForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: (product: any, quantity: number) => void }) {
  const { t, language } = useTranslation();
  const { data: prodData } = useProducts({ status: "ACTIF" });
  const { mutateAsync, isPending } = useCreateStockMovement();
  const { addToast } = useUIStore();
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<StockMovementInput>({
    resolver: zodResolver(stockMovementSchema),
  });

  const productId = watch("productId");
  const type = watch("type");

  useEffect(() => {
    if (productId && type && prodData?.data) {
      const product = prodData.data.find((p: any) => p.id === productId);
      if (product) {
        const isSaleOrReturn = type.startsWith("SORTIE_") || type === "ENTREE_RETOUR";
        const price = isSaleOrReturn ? product.sellPrice : product.buyPrice;
        setValue("unitPrice", price);
      }
    }
  }, [productId, type, prodData, setValue]);

  const onSubmit = async (data: StockMovementInput) => {
    const res = await mutateAsync(data);
    if (res.error) { addToast({ type: "error", title: t.common.error, message: typeof res.error === "string" ? res.error : (language === "fr" ? "Erreur" : "Error") }); return; }
    addToast({ type: "success", title: t.stock.modal.success });
    onClose();

    if (data.type.startsWith("ENTREE") && prodData?.data && onSuccess) {
      const product = prodData.data.find((p: any) => p.id === data.productId);
      if (product) {
        onSuccess(product, data.quantity);
      }
    }
  };

  const getMovementTypeLabel = (val: string) => {
    const labelsFr: Record<string, string> = {
      ENTREE_ACHAT: "Entrée — Achat",
      ENTREE_RETOUR: "Entrée — Retour client",
      ENTREE_AJUSTEMENT: "Entrée — Ajustement",
      SORTIE_VENTE: "Sortie — Vente",
      SORTIE_USAGE_INTERNE: "Sortie — Usage interne",
      SORTIE_PERTE: "Sortie — Perte / Casse",
      SORTIE_RETOUR_FOURNISSEUR: "Sortie — Retour fournisseur",
      AJUSTEMENT_INVENTAIRE: "Ajustement inventaire"
    };

    const labelsEn: Record<string, string> = {
      ENTREE_ACHAT: "Stock In — Purchase",
      ENTREE_RETOUR: "Stock In — Customer return",
      ENTREE_AJUSTEMENT: "Stock In — Adjustment",
      SORTIE_VENTE: "Stock Out — Sale",
      SORTIE_USAGE_INTERNE: "Stock Out — Internal use",
      SORTIE_PERTE: "Stock Out — Loss / Breakage",
      SORTIE_RETOUR_FOURNISSEUR: "Stock Out — Supplier return",
      AJUSTEMENT_INVENTAIRE: "Inventory adjustment"
    };

    return language === "fr" ? (labelsFr[val] || val) : (labelsEn[val] || val);
  };

  const MOVEMENT_TYPES_OPTIONS = [
    { value: "ENTREE_ACHAT", label: getMovementTypeLabel("ENTREE_ACHAT") },
    { value: "ENTREE_RETOUR", label: getMovementTypeLabel("ENTREE_RETOUR") },
    { value: "ENTREE_AJUSTEMENT", label: getMovementTypeLabel("ENTREE_AJUSTEMENT") },
    { value: "SORTIE_VENTE", label: getMovementTypeLabel("SORTIE_VENTE") },
    { value: "SORTIE_USAGE_INTERNE", label: getMovementTypeLabel("SORTIE_USAGE_INTERNE") },
    { value: "SORTIE_PERTE", label: getMovementTypeLabel("SORTIE_PERTE") },
    { value: "SORTIE_RETOUR_FOURNISSEUR", label: getMovementTypeLabel("SORTIE_RETOUR_FOURNISSEUR") },
    { value: "AJUSTEMENT_INVENTAIRE", label: getMovementTypeLabel("AJUSTEMENT_INVENTAIRE") },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">{language === "fr" ? "Nouveau mouvement de stock" : "New stock movement"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">{language === "fr" ? "Produit *" : "Product *"}</label>
            <Controller name="productId" control={control} render={({ field }) => (
              <SearchableSelect options={(prodData?.data || []).map((p: any) => ({ value: p.id, label: p.name, sub: `Stock: ${p.currentStock} ${p.unit}` }))} value={field.value || ""} onChange={field.onChange} placeholder={t.stock.modal.product} searchPlaceholder={language === "fr" ? "Rechercher un produit…" : "Search product…"} />
            )} />
            {errors.productId && <p className="text-red-500 text-xs mt-1">{errors.productId.message}</p>}
          </div>
          <div>
            <label className="label">{t.stock.modal.type}</label>
            <Controller name="type" control={control} render={({ field }) => (
              <SearchableSelect options={MOVEMENT_TYPES_OPTIONS} value={field.value || ""} onChange={field.onChange} placeholder={t.actions.select} searchPlaceholder={language === "fr" ? "Rechercher un type…" : "Search type…"} />
            )} />
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t.stock.modal.qty}</label>
              <input {...register("quantity", { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="input" placeholder="0" />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label">{language === "fr" ? "Prix unitaire (FCFA) *" : "Unit price (FCFA) *"}</label>
              <input {...register("unitPrice", { valueAsNumber: true, required: language === "fr" ? "Le prix unitaire est requis" : "Unit price is required" })} type="number" className="input" placeholder="0" />
              {errors.unitPrice && <p className="text-red-500 text-xs mt-1">{errors.unitPrice.message as string}</p>}
            </div>
          </div>
          <div>
            <label className="label">{language === "fr" ? "Référence / N° document" : "Reference / Document N°"}</label>
            <input {...register("reference")} className="input" placeholder="BC-2025-0001, invoice N°…" />
          </div>
          <div>
            <label className="label">{t.stock.table.reason}</label>
            <textarea {...register("note")} className="input h-20 resize-none" placeholder={t.stock.modal.reason} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">{t.actions.cancel}</button>
            <button 
              type="submit" 
              disabled={isPending} 
              className="btn-primary flex items-center justify-center gap-2 min-w-[120px] transition-all disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.actions.saving}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{t.actions.save}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockPage() {
  const { t, language } = useTranslation();
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isFetching, refetch } = useStockMovements({ type: typeFilter });
  const movements = data?.data || [];

  const [printItems, setPrintItems] = useState<BarcodePrintItem[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const getMovementTypeLabel = (val: string) => {
    const labelsFr: Record<string, string> = {
      ENTREE_ACHAT: "Entrée — Achat",
      ENTREE_RETOUR: "Entrée — Retour client",
      ENTREE_AJUSTEMENT: "Entrée — Ajustement",
      SORTIE_VENTE: "Sortie — Vente",
      SORTIE_USAGE_INTERNE: "Sortie — Usage interne",
      SORTIE_PERTE: "Sortie — Perte / Casse",
      SORTIE_RETOUR_FOURNISSEUR: "Sortie — Retour fournisseur",
      AJUSTEMENT_INVENTAIRE: "Ajustement inventaire"
    };

    const labelsEn: Record<string, string> = {
      ENTREE_ACHAT: "Stock In — Purchase",
      ENTREE_RETOUR: "Stock In — Customer return",
      ENTREE_AJUSTEMENT: "Stock In — Adjustment",
      SORTIE_VENTE: "Stock Out — Sale",
      SORTIE_USAGE_INTERNE: "Stock Out — Internal use",
      SORTIE_PERTE: "Stock Out — Loss / Breakage",
      SORTIE_RETOUR_FOURNISSEUR: "Stock Out — Supplier return",
      AJUSTEMENT_INVENTAIRE: "Inventory adjustment"
    };

    return language === "fr" ? (labelsFr[val] || val) : (labelsEn[val] || val);
  };

  const MOVEMENT_TYPES_OPTIONS = [
    { value: "ENTREE_ACHAT", label: getMovementTypeLabel("ENTREE_ACHAT") },
    { value: "ENTREE_RETOUR", label: getMovementTypeLabel("ENTREE_RETOUR") },
    { value: "ENTREE_AJUSTEMENT", label: getMovementTypeLabel("ENTREE_AJUSTEMENT") },
    { value: "SORTIE_VENTE", label: getMovementTypeLabel("SORTIE_VENTE") },
    { value: "SORTIE_USAGE_INTERNE", label: getMovementTypeLabel("SORTIE_USAGE_INTERNE") },
    { value: "SORTIE_PERTE", label: getMovementTypeLabel("SORTIE_PERTE") },
    { value: "SORTIE_RETOUR_FOURNISSEUR", label: getMovementTypeLabel("SORTIE_RETOUR_FOURNISSEUR") },
    { value: "AJUSTEMENT_INVENTAIRE", label: getMovementTypeLabel("AJUSTEMENT_INVENTAIRE") },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.stock.title}</h1>
          <p className="text-gray-500 text-sm">{data?.total || 0} {language === "fr" ? "mouvement(s)" : "movement(s)"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2"><RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> {language === "fr" ? "Nouveau mouvement" : "New movement"}
          </button>
        </div>
      </div>
      <div className="card p-4">
        <SearchableSelect options={MOVEMENT_TYPES_OPTIONS} value={typeFilter} onChange={setTypeFilter} placeholder={language === "fr" ? "Tous les mouvements" : "All movements"} searchPlaceholder={language === "fr" ? "Rechercher un type…" : "Search type…"} allowAll allLabel={language === "fr" ? "Tous les mouvements" : "All movements"} className="w-64" />
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t.stock.table.date}</th>
              <th>{t.stock.table.product}</th>
              <th>{t.stock.table.type}</th>
              <th>{t.stock.table.qty}</th>
              <th>{language === "fr" ? "Prix Unit." : "Unit Price"}</th>
              <th>{language === "fr" ? "Marge" : "Margin"}</th>
              <th>{language === "fr" ? "Référence" : "Reference"}</th>
              <th>{t.stock.table.operator}</th>
              <th>{t.stock.table.reason}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={9} />
            ) : movements.length === 0 ? (
              <TableEmpty colSpan={9} message={language === "fr" ? "Aucun mouvement trouvé" : "No movements found"} icon={ArrowLeftRight} />
            ) : movements.map((m: any) => {
              const isIn = m.type.startsWith("ENTREE");
              const buyPrice = m.product?.buyPrice || 0;
              const sellPrice = m.product?.sellPrice || 0;
              const unitPrice = m.unitPrice ?? sellPrice;
              const quantity = m.quantity || 0;

              let margin = 0;
              let hasMargin = false;

              if (m.type === "SORTIE_VENTE") {
                margin = (unitPrice - buyPrice) * quantity;
                hasMargin = true;
              } else if (m.type === "ENTREE_RETOUR") {
                margin = - (unitPrice - buyPrice) * quantity;
                hasMargin = true;
              } else if (m.type === "SORTIE_PERTE" || m.type === "SORTIE_USAGE_INTERNE") {
                margin = - buyPrice * quantity;
                hasMargin = true;
              }

              return (
                <tr key={m.id}>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                  <td><div className="font-medium">{m.product?.name}</div><div className="text-xs text-gray-400 font-mono">{m.product?.sku}</div></td>
                  <td><div className="flex items-center gap-1.5"><span className={`p-1 rounded-full ${isIn ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{isIn ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span><span className="text-xs">{getMovementTypeLabel(m.type)}</span></div></td>
                  <td className={`font-bold ${isIn ? "text-green-700" : "text-red-700"}`}>{isIn ? "+" : "-"}{m.quantity} {m.product?.unit}</td>
                  <td>{m.unitPrice ? formatCurrency(m.unitPrice) : "—"}</td>
                  <td>
                    {hasMargin ? (
                      <span className={cn(
                        "font-semibold text-xs px-2.5 py-1 rounded-full border",
                        margin > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                        margin < 0 ? "bg-rose-50 text-rose-700 border-rose-200" : 
                        "bg-slate-50 text-slate-600 border-slate-200"
                      )}>
                        {margin > 0 ? "+" : ""}{formatCurrency(margin)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="text-xs text-gray-500">{m.reference || "—"}</td>
                  <td className="text-xs text-gray-500">{m.user?.name}</td>
                  <td className="text-xs text-gray-400 max-w-32 truncate">{m.note || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showForm && (
        <MovementForm 
          onClose={() => setShowForm(false)} 
          onSuccess={(product, qty) => {
            setPrintItems([{
              id: product.id,
              name: product.name,
              sku: product.sku,
              barcode: product.barcode || product.sku,
              sellPrice: product.sellPrice,
              quantity: Math.max(1, Math.round(qty))
            }]);
            setIsPrintModalOpen(true);
          }}
        />
      )}

      <BarcodePrintModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        initialItems={printItems} 
      />
    </div>
  );
}
