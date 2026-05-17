"use client";
// src/app/(dashboard)/commandes/page.tsx
import { useState, useEffect } from "react";
import { usePurchaseOrders, useReceiveOrder, useDeletePurchaseOrder, useSettings } from "@/hooks/useQueries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingCart, Plus, RefreshCw, CheckCircle, PackageCheck, Search, Loader2, X, AlertTriangle, Printer, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/stores/useUIStore";
import { usePermissions } from "@/components/auth/HasPermission";

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
            <p className="text-xs text-amber-800 leading-relaxed font-semibold">
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

function DeleteConfirmationModal({ order, onClose, onConfirm, isPending }: { order: any, onClose: () => void, onConfirm: () => void, isPending: boolean }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Trash2 className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Supprimer le bon ?</h2>
          <p className="text-gray-500 text-sm">
            Êtes-vous sûr de vouloir supprimer le bon de commande <span className="font-mono font-bold text-red-600">{order.number}</span> ?
          </p>
          {order.status === "RECU" && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 leading-relaxed font-semibold">
                Attention : Ce bon de commande a déjà été REÇU. La suppression annulera les mouvements de stock associés et diminuera la dette fournisseur de {formatCurrency(order.total)}.
              </p>
            </div>
          )}
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
            className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommandesPage() {
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [confirmOrder, setConfirmOrder] = useState<any>(null);
  const [deleteOrder, setDeleteOrder] = useState<any>(null);
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Row action click spinner state variables
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [navigatingOrderId, setNavigatingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);

  const { data, isLoading, refetch } = usePurchaseOrders();
  const { data: settingsData } = useSettings();
  const receiveOrder = useReceiveOrder();
  const deleteMutation = useDeletePurchaseOrder();
  const { addToast } = useUIStore();

  const orders = data?.data || [];
  const settings = settingsData?.data || {};
  
  const filteredOrders = search 
    ? orders.filter((o: any) => o.number.toLowerCase().includes(search.toLowerCase()))
    : orders;

  const handleConfirmReceive = async () => {
    if (!confirmOrder) return;
    try {
      await receiveOrder.mutateAsync(confirmOrder.id);
      addToast({ type: "success", title: "Réception validée", message: `Le stock a été mis à jour pour le bon ${confirmOrder.number}.` });
      setConfirmOrder(null);
      setReceivingOrderId(null);
    } catch (error) {
      addToast({ type: "error", title: "Erreur", message: "Impossible de valider la réception." });
      setReceivingOrderId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteOrder) return;
    try {
      await deleteMutation.mutateAsync(deleteOrder.id);
      addToast({ type: "success", title: "Suppression réussie", message: `Le bon de commande ${deleteOrder.number} a été supprimé.` });
      setDeleteOrder(null);
      setDeletingOrderId(null);
    } catch (err: any) {
      addToast({ type: "error", title: "Erreur de suppression", message: err.message || "Impossible de supprimer." });
      setDeletingOrderId(null);
    }
  };

  // Trigger browser print when printOrder is set
  useEffect(() => {
    if (printOrder) {
      const timer = setTimeout(() => {
        window.print();
        setPrintOrder(null);
        setPrintingOrderId(null);
      }, 500); // 500ms delay to display premium loader feedback
      return () => clearTimeout(timer);
    }
  }, [printOrder]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
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
          {hasPermission("orders.create") && (
            <Link 
              href="/commandes/nouveau" 
              onClick={() => setIsNavigating(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {isNavigating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Nouveau BC
            </Link>
          )}
        </div>
      </div>

      <div className="table-container print:hidden">
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
                  <div className="flex items-center justify-end gap-2">
                    {/* Reprint Button */}
                    <button 
                      onClick={() => {
                        setPrintingOrderId(o.id);
                        setPrintOrder(o);
                      }}
                      disabled={printingOrderId !== null || navigatingOrderId !== null || deletingOrderId !== null || receivingOrderId !== null}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors disabled:opacity-40"
                      title="Réimprimer le bon"
                    >
                      {printingOrderId === o.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                    </button>

                    {/* Edit Button (Only editable if NOT RECU and has orders.edit permission) */}
                    {hasPermission("orders.edit") && (
                      o.status !== "RECU" ? (
                        <Link 
                          href={`/commandes/${o.id}/modifier`}
                          onClick={() => setNavigatingOrderId(o.id)}
                          className={`p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors block ${
                            (printingOrderId !== null || navigatingOrderId !== null || deletingOrderId !== null || receivingOrderId !== null) ? "pointer-events-none opacity-40" : ""
                          }`}
                          title="Modifier le bon"
                        >
                          {navigatingOrderId === o.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                          ) : (
                            <Edit2 className="w-4 h-4" />
                          )}
                        </Link>
                      ) : (
                        <span className="p-1.5 text-gray-300 cursor-not-allowed" title="Bon déjà réceptionné">
                          <Edit2 className="w-4 h-4" />
                        </span>
                      )
                    )}

                    {/* Delete Button (Only visible if user has orders.delete permission) */}
                    {hasPermission("orders.delete") && (
                      <button 
                        onClick={() => {
                          setDeletingOrderId(o.id);
                          setDeleteOrder(o);
                        }}
                        disabled={printingOrderId !== null || navigatingOrderId !== null || deletingOrderId !== null || receivingOrderId !== null}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors disabled:opacity-40"
                        title="Supprimer le bon"
                      >
                        {deletingOrderId === o.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Receive order button (Only visible if user has orders.receive permission) */}
                    {hasPermission("orders.receive") && (
                      o.status !== "RECU" && o.status !== "ANNULE" ? (
                        <button
                          onClick={() => {
                            setReceivingOrderId(o.id);
                            setConfirmOrder(o);
                          }}
                          disabled={printingOrderId !== null || navigatingOrderId !== null || deletingOrderId !== null || receivingOrderId !== null}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-all text-xs font-bold shadow-sm disabled:opacity-40"
                        >
                          {receivingOrderId === o.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PackageCheck className="w-3.5 h-3.5" />
                          )}
                          Réception
                        </button>
                      ) : o.status === "RECU" ? (
                        <span className="text-green-500 flex items-center justify-end gap-1 text-xs font-bold bg-green-50 px-2 py-1 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5" /> Reçu
                        </span>
                      ) : null
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RECEPTION MODAL */}
      <ReceptionModal 
        order={confirmOrder}
        onClose={() => {
          setConfirmOrder(null);
          setReceivingOrderId(null);
        }}
        onConfirm={handleConfirmReceive}
        isPending={receiveOrder.isPending}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        order={deleteOrder}
        onClose={() => {
          setDeleteOrder(null);
          setDeletingOrderId(null);
        }}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />

      {/* HIGH-FIDELITY REPRINT TEMPLATE (Hidden from UI, visible in print) */}
      {printOrder && (
        <div className="hidden print:block bg-white p-10 text-black">
          <div className="flex justify-between border-b-2 border-gray-900 pb-8 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-blue-900 uppercase">{settings.company_name || "Boutique"}</h1>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{settings.company_address}</p>
              <p className="text-sm text-gray-600">{settings.company_phone} | {settings.company_email}</p>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-gray-300 uppercase leading-none mb-2">Bon de Commande</h2>
              <p className="text-xl font-mono font-bold">N° {printOrder.number}</p>
              <p className="text-sm">Date: {formatDate(printOrder.createdAt)}</p>
              {printOrder.expectedAt && <p className="text-sm font-bold text-red-600">Livraison prévue: {formatDate(printOrder.expectedAt)}</p>}
            </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg mb-8 border border-gray-200">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Fournisseur</h3>
            <p className="text-xl font-bold">{printOrder.supplier?.name}</p>
            <p className="text-sm">{printOrder.supplier?.address || printOrder.supplier?.city}</p>
            <p className="text-sm">{printOrder.supplier?.phone}</p>
          </div>

          <table className="w-full mb-10">
            <thead>
              <tr className="border-b-2 border-gray-900 text-left text-xs uppercase font-bold">
                <th className="py-2">Description</th>
                <th className="py-2 text-center">Qté</th>
                <th className="py-2 text-right">P.U HT</th>
                <th className="py-2 text-center">TVA</th>
                <th className="py-2 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {printOrder.items?.map((item: any) => (
                <tr key={item.id} className="text-sm">
                  <td className="py-3 font-medium">{item.product?.name || "Produit"}</td>
                  <td className="py-3 text-center">{item.quantity} {item.product?.unit || "Pièce"}</td>
                  <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 text-center">{item.taxRate}%</td>
                  <td className="py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-80 space-y-2 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm"><span>Sous-total HT:</span><span>{formatCurrency(printOrder.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span>Total TVA:</span><span>{formatCurrency(printOrder.taxAmount)}</span></div>
              <div className="flex justify-between text-xl font-black border-t-2 border-gray-900 pt-2">
                <span>TOTAL TTC:</span>
                <span>{formatCurrency(printOrder.total)}</span>
              </div>
            </div>
          </div>

          {printOrder.notes && (
            <div className="mt-10 p-4 border rounded text-sm italic text-gray-600">
              <strong>Notes:</strong> {printOrder.notes}
            </div>
          )}

          <div className="mt-20 flex justify-between">
            <div className="text-center w-48"><div className="border-t border-gray-400 pt-2 text-xs">Signature Fournisseur</div></div>
            <div className="text-center w-48"><div className="border-t border-gray-400 pt-2 text-xs">Cachet & Signature</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
