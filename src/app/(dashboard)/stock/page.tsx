"use client";
// src/app/(dashboard)/stock/page.tsx
import { useState, useEffect } from "react";
import { useStockMovements, useCreateStockMovement } from "@/hooks/useQueries";
import { useProducts } from "@/hooks/useProducts";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { ArrowLeftRight, Plus, RefreshCw, ArrowUp, ArrowDown, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockMovementSchema, type StockMovementInput } from "@/lib/validations";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";

const MOVEMENT_TYPES = [
  { value: "ENTREE_ACHAT", label: "Entrée — Achat", dir: "in" },
  { value: "ENTREE_RETOUR", label: "Entrée — Retour client", dir: "in" },
  { value: "ENTREE_AJUSTEMENT", label: "Entrée — Ajustement", dir: "in" },
  { value: "SORTIE_VENTE", label: "Sortie — Vente", dir: "out" },
  { value: "SORTIE_USAGE_INTERNE", label: "Sortie — Usage interne", dir: "out" },
  { value: "SORTIE_PERTE", label: "Sortie — Perte / Casse", dir: "out" },
  { value: "SORTIE_RETOUR_FOURNISSEUR", label: "Sortie — Retour fournisseur", dir: "out" },
  { value: "AJUSTEMENT_INVENTAIRE", label: "Ajustement inventaire", dir: "neutral" },
];

function MovementForm({ onClose }: { onClose: () => void }) {
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
    if (res.error) { addToast({ type: "error", title: "Erreur", message: typeof res.error === "string" ? res.error : "Erreur" }); return; }
    addToast({ type: "success", title: "Mouvement enregistré" });
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">Nouveau mouvement de stock</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Produit *</label>
            <Controller name="productId" control={control} render={({ field }) => (
              <SearchableSelect options={(prodData?.data || []).map((p: any) => ({ value: p.id, label: p.name, sub: `Stock: ${p.currentStock} ${p.unit}` }))} value={field.value || ""} onChange={field.onChange} placeholder="Sélectionner un produit…" searchPlaceholder="Rechercher un produit…" />
            )} />
            {errors.productId && <p className="text-red-500 text-xs mt-1">{errors.productId.message}</p>}
          </div>
          <div>
            <label className="label">Type de mouvement *</label>
            <Controller name="type" control={control} render={({ field }) => (
              <SearchableSelect options={MOVEMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))} value={field.value || ""} onChange={field.onChange} placeholder="Sélectionner…" searchPlaceholder="Rechercher un type…" />
            )} />
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Quantité *</label>
              <input {...register("quantity", { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="input" placeholder="0" />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label">Prix unitaire (FCFA) *</label>
              <input {...register("unitPrice", { valueAsNumber: true, required: "Le prix unitaire est requis" })} type="number" className="input" placeholder="0" />
              {errors.unitPrice && <p className="text-red-500 text-xs mt-1">{errors.unitPrice.message as string}</p>}
            </div>
          </div>
          <div>
            <label className="label">Référence / N° document</label>
            <input {...register("reference")} className="input" placeholder="BC-2025-0001, facture N°…" />
          </div>
          <div>
            <label className="label">Motif / Note</label>
            <textarea {...register("note")} className="input h-20 resize-none" placeholder="Motif optionnel…" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button 
              type="submit" 
              disabled={isPending} 
              className="btn-primary flex items-center justify-center gap-2 min-w-[120px] transition-all disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer</span>
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
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isFetching, refetch } = useStockMovements({ type: typeFilter });
  const movements = data?.data || [];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mouvements de stock</h1>
          <p className="text-gray-500 text-sm">{data?.total || 0} mouvement(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2"><RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nouveau mouvement
          </button>
        </div>
      </div>
      <div className="card p-4">
        <SearchableSelect options={MOVEMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))} value={typeFilter} onChange={setTypeFilter} placeholder="Tous les mouvements" searchPlaceholder="Rechercher un type…" allowAll allLabel="Tous les mouvements" className="w-64" />
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Produit</th><th>Type</th><th>Quantité</th><th>Prix Unit.</th><th>Marge</th><th>Référence</th><th>Utilisateur</th><th>Note</th></tr></thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={9} />
            ) : movements.length === 0 ? (
              <TableEmpty colSpan={9} message="Aucun mouvement trouvé" icon={ArrowLeftRight} />
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
                  <td><div className="flex items-center gap-1.5"><span className={`p-1 rounded-full ${isIn ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{isIn ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span><span className="text-xs">{MOVEMENT_TYPES.find(t => t.value === m.type)?.label || m.type}</span></div></td>
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
      {showForm && <MovementForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

