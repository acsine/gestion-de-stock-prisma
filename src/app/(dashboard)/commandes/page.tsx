"use client";
// src/app/(dashboard)/commandes/page.tsx
import { useState } from "react";
import { usePurchaseOrders, useReceiveOrder } from "@/hooks/useQueries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingCart, Plus, RefreshCw, CheckCircle, PackageCheck, Search, Loader2, X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/stores/useUIStore";

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", ENVOYE: "Envoyé",
  PARTIELLEMENT_RECU: "Part. reçu", RECU: "Reçu", ANNULE: "Annulé",
};
const STATUS_COLORS: Record<string, string> = {
  BROUILLON: "badge-gray", ENVOYE: "badge-blue",
  PARTIELLEMENT_RECU: "badge-yellow", RECU: "badge-green", ANNULE: "badge-red",
};

function ReceptionModal({ order, onClose, onConfirm, isPending }: { order: any, onClose: () => void, onConfirm: () => void, isPending: boolean }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <PackageCheck className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Valider la réception</h2>
          <p className="text-gray-500">
            Vous allez confirmer la réception du bon de commande <span className="font-mono font-bold text-blue-600">{order.number}</span>.
          </p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Cette action mettra à jour automatiquement les niveaux de stock pour tous les articles de ce bon de commande. Cette opération est irréversible.
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 flex gap-3">
          <button 
            onClick={onClose} 
            disabled={isPending} 
            className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button 
            onClick={onConfirm} 
            disabled={isPending} 
            className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommandesPage() {
  const [search, setSearch] = useState("");
  const [confirmOrder, setConfirmOrder] = useState<any>(null);
  const { data, isLoading, refetch } = usePurchaseOrders();
  const receiveOrder = useReceiveOrder();
  const { addToast } = useUIStore();

  const orders = data?.data || [];
  
  const filteredOrders = search 
    ? orders.filter((o: any) => o.number.toLowerCase().includes(search.toLowerCase()))
    : orders;

  const handleConfirmReceive = async () => {
    if (!confirmOrder) return;
    try {
      await receiveOrder.mutateAsync(confirmOrder.id);
      addToast({ type: "success", title: "Réception validée", message: `Le stock a été mis à jour pour le bon ${confirmOrder.number}.` });
      setConfirmOrder(null);
    } catch (error) {
      addToast({ type: "error", title: "Erreur", message: "Impossible de valider la réception." });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de commande</h1>
          <p className="text-gray-500 text-sm">{data?.total || 0} bon(s) au total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher par N° BC..." 
              className="input pl-10 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => refetch()} className="btn-secondary p-2.5">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/commandes/nouveau" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nouveau BC
          </Link>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>N° BC</th>
              <th>Fournisseur</th>
              <th>Date</th>
              <th>Livraison</th>
              <th className="text-center">Articles</th>
              <th className="text-right">Total TTC</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400"><ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />Aucun bon de commande trouvé</td></tr>
            ) : filteredOrders.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="font-mono font-bold text-blue-600">{o.number}</td>
                <td>
                  <div className="font-medium text-gray-900">{o.supplier?.name}</div>
                  <div className="text-xs text-gray-500">{o.supplier?.city || "Fournisseur"}</div>
                </td>
                <td className="text-sm text-gray-500">{formatDate(o.createdAt)}</td>
                <td className="text-sm text-gray-500">{o.expectedAt ? formatDate(o.expectedAt) : "—"}</td>
                <td className="text-center">
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {o.items?.length || 0}
                  </span>
                </td>
                <td className="font-bold text-right text-gray-900">{formatCurrency(o.total)}</td>
                <td>
                  <span className={`text-xs ${STATUS_COLORS[o.status] || "badge-gray"}`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </td>
                <td className="text-right">
                  {o.status !== "RECU" && o.status !== "ANNULE" && (
                    <button
                      onClick={() => setConfirmOrder(o)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-all text-xs font-bold shadow-sm"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      Valider Réception
                    </button>
                  )}
                  {o.status === "RECU" && (
                    <span className="text-green-500 flex items-center justify-end gap-1 text-xs font-medium">
                      <CheckCircle className="w-4 h-4" /> Stock à jour
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReceptionModal 
        order={confirmOrder}
        onClose={() => setConfirmOrder(null)}
        onConfirm={handleConfirmReceive}
        isPending={receiveOrder.isPending}
      />
    </div>
  );
}
