"use client";
// src/app/(dashboard)/stock/page.tsx
import { useState, useEffect, useRef } from "react";
import { useStockMovements, useCreateStockMovement, useWarehouses, useCreateWarehouse, useWarehouseTransfers, useCreateWarehouseTransfer, useReceiveWarehouseTransfer } from "@/hooks/useQueries";
import { useProducts } from "@/hooks/useProducts";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useTranslation } from "@/locales/i18n";
import { ArrowLeftRight, Plus, RefreshCw, ArrowUp, ArrowDown, X, Home, ShoppingBag, Truck, Printer, CheckCircle2, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockMovementSchema, warehouseSchema, warehouseTransferSchema, type StockMovementInput, type WarehouseInput, type WarehouseTransferInput } from "@/lib/validations";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";
import { BarcodePrintModal, type BarcodePrintItem } from "@/components/ui/BarcodePrintModal";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

// Modal d'impression du Bon de Livraison / Réception
function DeliveryNotePrintModal({ transfer, onClose }: { transfer: any; onClose: () => void }) {
  const { language } = useTranslation();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      const win = window.open("", "_blank");
      win?.document.write(`
        <html>
          <head>
            <title>Bon de Livraison/Réception #${transfer.id.slice(-6)}</title>
            <style>
              body { font-family: 'Outfit', 'Inter', sans-serif; padding: 20px; color: #333; }
              .header { display: flex; justify-between: space-between; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
              .title { font-size: 22px; font-weight: bold; text-transform: uppercase; }
              .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .table { w-full: 100%; border-collapse: collapse; margin-bottom: 40px; }
              .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              .table th { background-color: #f5f5f5; }
              .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 50px; }
              .sig-box { border: 1px dashed #999; height: 120px; padding: 10px; border-radius: 8px; position: relative; }
              .sig-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 5px; }
              .footer { text-align: center; font-size: 10px; color: #777; margin-top: 60px; border-top: 1px solid #ddd; padding-top: 10px; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      win?.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">📄 {language === "fr" ? "Bon de Livraison / Réception" : "Delivery & Receipt Voucher"}</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-primary flex items-center gap-2 py-1.5 px-4 text-xs font-semibold shadow-sm">
              <Printer className="w-4 h-4" />
              <span>{language === "fr" ? "Imprimer le Bon" : "Print Voucher"}</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Zone imprimable */}
        <div className="p-8 overflow-y-auto flex-1 bg-slate-50" ref={printAreaRef}>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
            {/* Header Document */}
            <div className="flex justify-between border-b pb-5 mb-6">
              <div>
                <h3 className="text-lg font-black text-blue-900 uppercase">ThaborSolution ERP</h3>
                <p className="text-[10px] text-gray-500 mt-1">Logiciel de Gestion de Stock Réseau</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-black uppercase text-gray-900">{language === "fr" ? "BON DE LIVRAISON & RÉCEPTION" : "DELIVERY & RECEIPT NOTE"}</h2>
                <p className="text-xs text-blue-700 font-mono font-bold mt-1">#TR-{transfer.id.slice(-6).toUpperCase()}</p>
              </div>
            </div>

            {/* Expéditeur & Destinataire */}
            <div className="grid grid-cols-2 gap-6 text-xs mb-8 border-b pb-5">
              <div className="space-y-1 bg-gray-50 p-3 rounded-xl">
                <strong className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Expéditeur / Source</strong>
                <span className="font-bold text-gray-800 text-sm block">🏭 {transfer.sourceWarehouse?.name}</span>
                <span className="text-gray-500">{transfer.sourceWarehouse?.location || "—"}</span>
              </div>
              <div className="space-y-1 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <strong className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Destinataire / Destination</strong>
                <span className="font-bold text-blue-900 text-sm block">🏪 {transfer.destinationWarehouse?.name}</span>
                <span className="text-blue-700">{transfer.destinationWarehouse?.location || "—"}</span>
              </div>
            </div>

            {/* Informations Document */}
            <div className="grid grid-cols-3 gap-4 text-xs mb-6 bg-slate-50 p-3 rounded-xl border">
              <div>
                <span className="text-gray-400 block">Date de sortie :</span>
                <strong className="text-gray-800 font-semibold">{formatDate(transfer.createdAt)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Référence Doc :</span>
                <strong className="text-gray-800 font-semibold">{transfer.reference || "Aucune"}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Statut Validation :</span>
                <span className={cn(
                  "font-bold uppercase text-[9px] px-2 py-0.5 rounded-full inline-block mt-0.5",
                  transfer.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                )}>
                  {transfer.status}
                </span>
              </div>
            </div>

            {/* Liste des articles */}
            <table className="w-full text-xs text-left border-collapse mb-8">
              <thead>
                <tr className="bg-gray-100 font-bold text-gray-700 border-b">
                  <th className="p-3">SKU</th>
                  <th className="p-3">Désignation Produit</th>
                  <th className="p-3 text-right">Quantité Expédiée</th>
                  <th className="p-3 text-right">Quantité Réceptionnée</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transfer.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="p-3 font-mono text-[10px] text-gray-400">{item.product?.sku}</td>
                    <td className="p-3 font-semibold text-gray-800">{item.product?.name}</td>
                    <td className="p-3 text-right font-bold text-gray-900">{item.quantity} {item.product?.unit}</td>
                    <td className="p-3 text-right font-bold text-green-700">
                      {transfer.status === "COMPLETED" ? `${item.quantity} ${item.product?.unit}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Remarques */}
            {transfer.notes && (
              <div className="p-3 bg-gray-50 border rounded-xl text-[10px] text-gray-500 mb-8">
                <strong>Remarques :</strong> {transfer.notes}
              </div>
            )}

            {/* Zone de Signatures */}
            <div className="grid grid-cols-2 gap-6 mt-10">
              <div className="border border-dashed border-gray-300 rounded-xl p-3 h-32 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">✍️ Visa Expéditeur (Gestionnaire Dépôt)</span>
                <span className="text-[10px] text-gray-500 text-center italic border-t pt-2">Nom & Date : {transfer.user?.name}</span>
              </div>
              <div className="border border-dashed border-blue-300 rounded-xl p-3 h-32 flex flex-col justify-between bg-blue-50/10">
                <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">✍️ Visa Réceptionnaire (Responsable Boutique)</span>
                <span className="text-[10px] text-gray-400 text-center italic border-t border-blue-100 pt-2">Nom, Date & Signature</span>
              </div>
            </div>

            <div className="text-center text-[9px] text-gray-400 italic mt-12 border-t pt-4">
              Ce bon de livraison et réception certifie le mouvement physique des marchandises entre les entrepôts du groupe.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Formulaire pour créer un transfert
function TransferForm({ onClose, warehouses }: { onClose: () => void; warehouses: any[] }) {
  const { t, language } = useTranslation();
  const { data: prodData } = useProducts({ status: "ACTIF" });
  const { mutateAsync, isPending } = useCreateWarehouseTransfer();
  const { addToast } = useUIStore();

  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [currentProduct, setCurrentProduct] = useState("");
  const [currentQty, setCurrentQty] = useState(1);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<any>({
    resolver: zodResolver(warehouseTransferSchema) as any,
    defaultValues: { items: [] }
  });

  // Sync selected items to React Hook Form for Zod items validation
  useEffect(() => {
    setValue("items", selectedItems, { shouldValidate: true });
  }, [selectedItems, setValue]);

  const sourceWarehouseId = watch("sourceWarehouseId");
  const destinationWarehouseId = watch("destinationWarehouseId");

  // Filter option lists to prevent selecting the same warehouse
  const sourceOptions = warehouses
    .filter((w: any) => w.id !== destinationWarehouseId)
    .map((w: any) => ({ value: w.id, label: w.name, sub: w.code }));

  const destinationOptions = warehouses
    .filter((w: any) => w.id !== sourceWarehouseId)
    .map((w: any) => ({ value: w.id, label: w.name, sub: w.code }));

  const onSubmit = async (data: any) => {
    if (selectedItems.length === 0) {
      addToast({ type: "error", title: "Erreur", message: "Veuillez ajouter au moins un produit." });
      return;
    }

    const payload = {
      ...data,
      items: selectedItems
    };

    const res = await mutateAsync(payload);
    if (res.error) {
      addToast({ type: "error", title: t.common.error, message: res.error });
      return;
    }

    addToast({ type: "success", title: "Sortie de stock initiée en temps réel" });
    onClose();
  };

  const addItem = () => {
    if (!currentProduct) return;
    const exists = selectedItems.find((i) => i.productId === currentProduct);
    if (exists) {
      setSelectedItems(selectedItems.map((i) => i.productId === currentProduct ? { ...i, quantity: i.quantity + currentQty } : i));
    } else {
      setSelectedItems([...selectedItems, { productId: currentProduct, quantity: currentQty }]);
    }
    setCurrentProduct("");
    setCurrentQty(1);
  };

  const removeItem = (prodId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.productId !== prodId));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">🚚 {language === "fr" ? "Initier un transfert / Sortie Boutique" : "New Warehouse Transfer"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Warehouse Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{language === "fr" ? "Entrepôt Source *" : "Source Warehouse *"}</label>
              <Controller name="sourceWarehouseId" control={control} render={({ field }) => (
                <SearchableSelect 
                  options={sourceOptions} 
                  value={field.value || ""} 
                  onChange={field.onChange} 
                  placeholder={language === "fr" ? "Sélectionner source..." : "Select source..."} 
                />
              )} />
              {errors.sourceWarehouseId && <p className="text-red-500 text-xs mt-1">{(errors.sourceWarehouseId as any).message}</p>}
            </div>
            <div>
              <label className="label">{language === "fr" ? "Boutique / Destination *" : "Shop / Destination *"}</label>
              <Controller name="destinationWarehouseId" control={control} render={({ field }) => (
                <SearchableSelect 
                  options={destinationOptions} 
                  value={field.value || ""} 
                  onChange={field.onChange} 
                  placeholder={language === "fr" ? "Sélectionner boutique..." : "Select shop..."} 
                />
              )} />
              {errors.destinationWarehouseId && <p className="text-red-500 text-xs mt-1">{(errors.destinationWarehouseId as any).message}</p>}
              {errors.items && <p className="text-red-500 text-xs mt-1 font-bold">{(errors.items as any).message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{language === "fr" ? "Référence Document" : "Voucher Reference"}</label>
              <input {...register("reference")} className="input" placeholder="BC-..." />
            </div>
            <div>
              <label className="label">{language === "fr" ? "Notes / Observations" : "Voucher Notes"}</label>
              <input {...register("notes")} className="input" placeholder="..." />
            </div>
          </div>

          {/* Add Item Widget */}
          <div className="border border-blue-100 rounded-xl bg-blue-50/20 p-4 space-y-3">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">🛒 Ajouter des produits au Bon</h3>
            <div className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-3">
                <label className="label text-[10px] text-gray-400 font-bold uppercase">Produit</label>
                <SearchableSelect 
                  options={(prodData?.data || []).map((p: any) => ({ value: p.id, label: p.name, sub: `SKU: ${p.sku} | Global: ${p.currentStock}` }))} 
                  value={currentProduct} 
                  onChange={setCurrentProduct} 
                  placeholder="..." 
                />
              </div>
              <div className="col-span-1">
                <label className="label text-[10px] text-gray-400 font-bold uppercase">Quantité</label>
                <input 
                  type="number" 
                  min="1" 
                  value={currentQty} 
                  onChange={(e) => setCurrentQty(parseInt(e.target.value) || 1)} 
                  className="input py-2" 
                />
              </div>
              <button 
                type="button" 
                onClick={addItem}
                className="col-span-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold py-2 px-3 text-xs flex items-center justify-center h-10 transition-colors"
              >
                + Ajouter
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Liste des articles ({selectedItems.length})</h3>
            {selectedItems.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-xl text-xs text-gray-400 bg-gray-50">Aucun produit ajouté</div>
            ) : (
              <div className="divide-y border rounded-xl overflow-hidden bg-white max-h-[25vh] overflow-y-auto">
                {selectedItems.map((item) => {
                  const prod = (prodData?.data || []).find((p: any) => p.id === item.productId);
                  return (
                    <div key={item.productId} className="p-3 flex justify-between items-center text-xs hover:bg-gray-50">
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-800">{prod?.name || "Produit inconnu"}</span>
                        <span className="text-[10px] text-gray-400 block">SKU: {prod?.sku}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-gray-900">{item.quantity} {prod?.unit}</span>
                        <button type="button" onClick={() => removeItem(item.productId)} className="text-red-500 hover:text-red-700">Supprimer</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">{t.actions.cancel}</button>
            <button 
              type="submit" 
              disabled={isPending || selectedItems.length === 0} 
              className="btn-primary flex items-center justify-center gap-2 min-w-[140px] transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === "fr" ? "Traitement..." : "Processing..."}</span>
                </>
              ) : (
                language === "fr" ? "Valider la Sortie" : "Validate Exit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal pour ajouter/éditer un dépôt
function WarehouseForm({ onClose }: { onClose: () => void }) {
  const { t, language } = useTranslation();
  const { mutateAsync, isPending } = useCreateWarehouse();
  const { addToast } = useUIStore();
  const { register, handleSubmit, control, formState: { errors } } = useForm<any>({
    resolver: zodResolver(warehouseSchema) as any,
    defaultValues: { isMain: false, isShop: false }
  });

  const onSubmit = async (data: WarehouseInput) => {
    const res = await mutateAsync(data);
    if (res.error) {
      addToast({ type: "error", title: "Erreur", message: res.error });
      return;
    }
    addToast({ type: "success", title: "Entrepôt configuré avec succès" });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">🏢 {language === "fr" ? "Nouveau Dépôt / Boutique" : "New Warehouse"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Nom de l'entrepôt *</label>
            <input {...register("name")} className="input" placeholder="Ex: Dépôt Ouest, Boutique Douala..." />
            {!!errors.name && <p className="text-red-500 text-xs mt-1">{(errors.name as any).message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Code Unique</label>
              <input {...register("code")} className="input" placeholder="Ex: WH-02" />
            </div>
            <div>
              <label className="label">Localisation / Ville</label>
              <input {...register("location")} className="input" placeholder="Ex: Yaoundé" />
            </div>
          </div>
          <div>
            <label className="label">Description / Notes</label>
            <textarea {...register("description")} className="input h-16 resize-none" placeholder="Détails..." />
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 border rounded-xl">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
              <input type="checkbox" {...register("isMain")} className="rounded text-blue-600 focus:ring-blue-500" />
              <span>Dépôt Principal</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
              <input type="checkbox" {...register("isShop")} className="rounded text-blue-600 focus:ring-blue-500" />
              <span>Boutique de Vente</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">{t.actions.cancel}</button>
            <button type="submit" disabled={isPending} className="btn-primary min-w-[120px]">
              {isPending ? "Création..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Formulaire Mouvement de stock original
function MovementForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: (product: any, quantity: number) => void }) {
  const { t, language } = useTranslation();
  const { data: prodData } = useProducts({ status: "ACTIF" });
  const { mutateAsync, isPending } = useCreateStockMovement();
  const { data: whData } = useWarehouses();
  const warehouses = whData?.data || [];
  const { addToast } = useUIStore();
  
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(stockMovementSchema) as any,
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

  const onSubmit = async (data: any) => {
    const res = await mutateAsync(data);
    if (res.error) { 
      addToast({ type: "error", title: t.common.error, message: typeof res.error === "string" ? res.error : (language === "fr" ? "Erreur" : "Error") }); 
      return; 
    }
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
      AJUSTEMENT_INVENTAIRE: "Ajustement inventaire",
      TRANSFERT_ENTREE: "Entrée par transfert",
      TRANSFERT_SORTIE: "Sortie par transfert"
    };

    const labelsEn: Record<string, string> = {
      ENTREE_ACHAT: "Stock In — Purchase",
      ENTREE_RETOUR: "Stock In — Customer return",
      ENTREE_AJUSTEMENT: "Stock In — Adjustment",
      SORTIE_VENTE: "Stock Out — Sale",
      SORTIE_USAGE_INTERNE: "Stock Out — Internal use",
      SORTIE_PERTE: "Stock Out — Loss / Breakage",
      SORTIE_RETOUR_FOURNISSEUR: "Stock Out — Supplier return",
      AJUSTEMENT_INVENTAIRE: "Inventory adjustment",
      TRANSFERT_ENTREE: "Transfer Stock In",
      TRANSFERT_SORTIE: "Transfer Stock Out"
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">{language === "fr" ? "Nouveau mouvement de stock" : "New stock movement"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Sélection de l'entrepôt */}
          <div>
            <label className="label">{language === "fr" ? "Cibler l'entrepôt *" : "Target Warehouse *"}</label>
            <Controller name="warehouseId" control={control} render={({ field }) => (
              <SearchableSelect 
                options={warehouses.map((w: any) => ({ value: w.id, label: w.name, sub: w.code }))} 
                value={field.value || ""} 
                onChange={field.onChange} 
                placeholder={language === "fr" ? "Sélectionner l'entrepôt..." : "Select warehouse..."} 
              />
            )} />
          </div>

          <div>
            <label className="label">{language === "fr" ? "Produit *" : "Product *"}</label>
            <Controller name="productId" control={control} render={({ field }) => (
              <SearchableSelect options={(prodData?.data || []).map((p: any) => ({ value: p.id, label: p.name, sub: `Stock: ${p.currentStock} ${p.unit}` }))} value={field.value || ""} onChange={field.onChange} placeholder={t.stock.modal.product} searchPlaceholder={language === "fr" ? "Rechercher un produit…" : "Search product…"} />
            )} />
            {!!errors.productId && <p className="text-red-500 text-xs mt-1">{(errors.productId as any).message}</p>}
          </div>
          <div>
            <label className="label">{t.stock.modal.type}</label>
            <Controller name="type" control={control} render={({ field }) => (
              <SearchableSelect options={MOVEMENT_TYPES_OPTIONS} value={field.value || ""} onChange={field.onChange} placeholder={t.actions.select} searchPlaceholder={language === "fr" ? "Rechercher un type…" : "Search type…"} />
            )} />
            {!!errors.type && <p className="text-red-500 text-xs mt-1">{(errors.type as any).message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t.stock.modal.qty}</label>
              <input {...register("quantity", { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="input" placeholder="0" />
              {!!errors.quantity && <p className="text-red-500 text-xs mt-1">{(errors.quantity as any).message}</p>}
            </div>
            <div>
              <label className="label">{language === "fr" ? "Prix unitaire (FCFA) *" : "Unit price (FCFA) *"}</label>
              <input {...register("unitPrice", { valueAsNumber: true, required: language === "fr" ? "Le prix unitaire est requis" : "Unit price is required" })} type="number" className="input" placeholder="0" />
              {!!errors.unitPrice && <p className="text-red-500 text-xs mt-1">{(errors.unitPrice as any).message}</p>}
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
          <div className="flex justify-end gap-3 pt-3 border-t">
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
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<"MOVEMENTS" | "WAREHOUSES" | "TRANSFERS">("MOVEMENTS");
  const [typeFilter, setTypeFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [activeTransferForPrint, setActiveTransferForPrint] = useState<any>(null);

  // Hook Queries
  const { data, isLoading, isFetching, refetch } = useStockMovements({ type: typeFilter, productId: warehouseFilter });
  const { data: whData, isLoading: isLoadingWh, refetch: refetchWh } = useWarehouses();
  const { data: transfersData, isLoading: isLoadingTransfers, refetch: refetchTransfers } = useWarehouseTransfers();
  const { mutateAsync: receiveTransfer, isPending: isReceiving } = useReceiveWarehouseTransfer();

  const movements = data?.data || [];
  const warehouses = whData?.data || [];
  const transfers = transfersData?.data || [];

  // 📡 ÉCOUTEUR SSE EN TEMPS RÉEL
  useEffect(() => {
    const tenantId = (session?.user as any)?.tenantId;
    if (!tenantId) return;

    // Créer la connexion EventSource
    console.log(`[SSE] Connexion au stream temps réel pour le tenant: ${tenantId}`);
    const sse = new EventSource(`/api/stock/transfers/events?tenantId=${tenantId}`);

    sse.addEventListener("transfer_created", (event: any) => {
      const payload = JSON.parse(event.data);
      console.log("[SSE] Nouveau transfert détecté !", payload);
      addToast({
        type: "info",
        title: "📢 Sortie de stock signalée",
        message: "Un nouveau transfert de marchandises est en cours d'acheminement vers votre boutique !"
      });
      // Invalidation instantanée pour rafraîchir la liste sans recharger la page !
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    });

    sse.addEventListener("transfer_received", (event: any) => {
      const payload = JSON.parse(event.data);
      console.log("[SSE] Réception de transfert validée !", payload);
      addToast({
        type: "success",
        title: "✅ Réception confirmée en direct",
        message: "Un point de vente a réceptionné avec succès son transfert de stock."
      });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    });

    return () => {
      console.log("[SSE] Fermeture de la connexion temps réel.");
      sse.close();
    };
  }, [session, queryClient, addToast]);

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
      AJUSTEMENT_INVENTAIRE: "Ajustement inventaire",
      TRANSFERT_ENTREE: "Entrée par transfert",
      TRANSFERT_SORTIE: "Sortie par transfert"
    };

    const labelsEn: Record<string, string> = {
      ENTREE_ACHAT: "Stock In — Purchase",
      ENTREE_RETOUR: "Stock In — Customer return",
      ENTREE_AJUSTEMENT: "Stock In — Adjustment",
      SORTIE_VENTE: "Stock Out — Sale",
      SORTIE_USAGE_INTERNE: "Stock Out — Internal use",
      SORTIE_PERTE: "Stock Out — Loss / Breakage",
      SORTIE_RETOUR_FOURNISSEUR: "Stock Out — Supplier return",
      AJUSTEMENT_INVENTAIRE: "Inventory adjustment",
      TRANSFERT_ENTREE: "Transfer In",
      TRANSFERT_SORTIE: "Transfer Out"
    };

    return language === "fr" ? (labelsFr[val] || val) : (labelsEn[val] || val);
  };

  const handleReceive = async (transferId: string) => {
    try {
      const res = await receiveTransfer(transferId);
      if (res.error) {
        addToast({ type: "error", title: "Erreur", message: res.error });
        return;
      }
      addToast({ type: "success", title: "Réception validée et stock boutique incrémenté !" });
    } catch (err: any) {
      addToast({ type: "error", title: "Erreur lors de la validation", message: err.message });
    }
  };

  return (
    <div className="space-y-5">
      {/* En-tête de page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📦 {language === "fr" ? "Gestion des Entrepôts & Stocks" : "Warehouse & Inventory"}
          </h1>
          <p className="text-gray-500 text-sm">
            {activeTab === "MOVEMENTS" 
              ? `${movements.length} mouvement(s)` 
              : activeTab === "WAREHOUSES" 
              ? `${warehouses.length} entrepôt(s)`
              : `${transfers.length} transfert(s) en transit`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { refetch(); refetchWh(); refetchTransfers(); }} 
            disabled={isFetching} 
            className="btn-secondary p-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          {activeTab === "WAREHOUSES" && (
            <button onClick={() => setShowWarehouseForm(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              <span>{language === "fr" ? "Nouveau Dépôt" : "New Warehouse"}</span>
            </button>
          )}
          {activeTab === "TRANSFERS" && (
            <button onClick={() => setShowTransferForm(true)} className="btn-primary flex items-center gap-2 text-sm shadow-md">
              <Truck className="w-4 h-4" />
              <span>{language === "fr" ? "Sortie de Stock" : "Transfer Stock"}</span>
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm shadow-md">
            <Plus className="w-4 h-4" /> {language === "fr" ? "Ajustement Stock" : "Adjust Inventory"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white p-1 rounded-2xl shadow-sm gap-1">
        <button 
          onClick={() => setActiveTab("MOVEMENTS")} 
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all ${activeTab === "MOVEMENTS" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>{language === "fr" ? "Historique des mouvements" : "Movements History"}</span>
        </button>
        <button 
          onClick={() => setActiveTab("WAREHOUSES")} 
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all ${activeTab === "WAREHOUSES" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Home className="w-4 h-4" />
          <span>{language === "fr" ? "Mes Entrepôts & Boutiques" : "My Warehouses"}</span>
        </button>
        <button 
          onClick={() => setActiveTab("TRANSFERS")} 
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all relative ${activeTab === "TRANSFERS" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Truck className="w-4 h-4" />
          <span>{language === "fr" ? "Sorties Dépôt & Bons" : "Transfers & Vouchers"}</span>
          {transfers.filter((t: any) => t.status === "PENDING").length > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
          )}
        </button>
      </div>

      {/* RENDU TAB 1 : MOUVEMENTS (Original) */}
      {activeTab === "MOVEMENTS" && (
        <div className="space-y-4">
          <div className="card p-4 bg-white">
            <SearchableSelect options={[
              { value: "ENTREE_ACHAT", label: getMovementTypeLabel("ENTREE_ACHAT") },
              { value: "ENTREE_RETOUR", label: getMovementTypeLabel("ENTREE_RETOUR") },
              { value: "ENTREE_AJUSTEMENT", label: getMovementTypeLabel("ENTREE_AJUSTEMENT") },
              { value: "SORTIE_VENTE", label: getMovementTypeLabel("SORTIE_VENTE") },
              { value: "SORTIE_USAGE_INTERNE", label: getMovementTypeLabel("SORTIE_USAGE_INTERNE") },
              { value: "SORTIE_PERTE", label: getMovementTypeLabel("SORTIE_PERTE") },
              { value: "SORTIE_RETOUR_FOURNISSEUR", label: getMovementTypeLabel("SORTIE_RETOUR_FOURNISSEUR") },
              { value: "AJUSTEMENT_INVENTAIRE", label: getMovementTypeLabel("AJUSTEMENT_INVENTAIRE") },
            ]} value={typeFilter} onChange={setTypeFilter} placeholder={language === "fr" ? "Tous les mouvements" : "All movements"} allowAll allLabel={language === "fr" ? "Tous les mouvements" : "All movements"} className="w-64" />
          </div>
          <div className="table-container bg-white rounded-2xl border shadow-sm">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.stock.table.date}</th>
                  <th>{t.stock.table.product}</th>
                  <th>{language === "fr" ? "Entrepôt" : "Warehouse"}</th>
                  <th>{t.stock.table.type}</th>
                  <th>{t.stock.table.qty}</th>
                  <th>{language === "fr" ? "Prix Unit." : "Unit Price"}</th>
                  <th>{language === "fr" ? "Marge" : "Margin"}</th>
                  <th>{language === "fr" ? "Référence" : "Reference"}</th>
                  <th>{t.stock.table.operator}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableLoading colSpan={9} />
                ) : movements.length === 0 ? (
                  <TableEmpty colSpan={9} message={language === "fr" ? "Aucun mouvement trouvé" : "No movements found"} icon={ArrowLeftRight} />
                ) : movements.map((m: any) => {
                  const isIn = m.type.startsWith("ENTREE") || m.type === "TRANSFERT_ENTREE";
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
                      <td><div className="font-semibold text-gray-800">{m.product?.name}</div><div className="text-[10px] text-gray-400 font-mono">{m.product?.sku}</div></td>
                      <td className="text-xs font-bold text-slate-700">{m.warehouse?.name || "Dépôt Principal"}</td>
                      <td><div className="flex items-center gap-1.5"><span className={`p-1 rounded-full ${isIn ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{isIn ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span><span className="text-xs font-semibold">{getMovementTypeLabel(m.type)}</span></div></td>
                      <td className={`font-bold ${isIn ? "text-green-700" : "text-red-700"}`}>{isIn ? "+" : "-"}{m.quantity} {m.product?.unit}</td>
                      <td className="font-mono text-xs">{m.unitPrice ? formatCurrency(m.unitPrice) : "—"}</td>
                      <td>
                        {hasMargin ? (
                          <span className={cn(
                            "font-semibold text-[10px] px-2 py-0.5 rounded-full border font-mono",
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
                      <td className="text-xs text-gray-500 font-mono">{m.reference || "—"}</td>
                      <td className="text-xs text-gray-400">{m.user?.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENDU TAB 2 : MES ENTREPOTS */}
      {activeTab === "WAREHOUSES" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {isLoadingWh ? (
            <div className="col-span-3 text-center py-20 text-gray-400">Chargement...</div>
          ) : warehouses.length === 0 ? (
            <div className="col-span-3 text-center py-20 text-gray-400">Aucun dépôt configuré.</div>
          ) : warehouses.map((w: any) => {
            return (
              <div key={w.id} className="bg-white border rounded-2xl shadow-sm p-5 space-y-4 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                      {w.isShop ? <ShoppingBag className="w-5 h-5 text-blue-600" /> : <Home className="w-5 h-5 text-emerald-600" />}
                      {w.name}
                    </h3>
                    <span className={cn(
                      "text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border uppercase",
                      w.isShop ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}>
                      {w.isShop ? "Showroom / Boutique" : "Dépôt Stockage"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-normal">{w.description || "Aucune description fournie"}</p>
                </div>

                <div className="space-y-2 border-t pt-3 text-xs">
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Code dépôt :</span>
                    <strong className="font-mono text-gray-900 font-bold">{w.code || "—"}</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Localisation :</span>
                    <strong className="text-gray-900 font-semibold">{w.location || "—"}</strong>
                  </div>
                </div>

                {w.isMain && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-950 font-bold text-[10px] uppercase py-1.5 px-3 rounded-lg text-center tracking-wide mt-2">
                    ⭐ Dépôt de Réception Principal
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* RENDU TAB 3 : TRANSFERTS & VALIDATION DE RECEPTION */}
      {activeTab === "TRANSFERS" && (
        <div className="space-y-5">
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-1">📡</span>
              <div>
                <h4 className="text-sm font-bold text-blue-950">{language === "fr" ? " validation croisée en deux étapes" : "Two-Step Validation Desk"}</h4>
                <p className="text-xs text-blue-800 leading-relaxed mt-0.5">
                  {language === "fr" 
                    ? "Le gestionnaire initie la sortie. Le transfert reste temporairement en statut [PENDING]. L'utilisateur de la boutique réceptrice doit valider la bonne réception de la marchandise pour que le stock boutique soit incrémenté."
                    : "The warehouse manager dispatches. The destination shop validates upon physical receipt to increment shop stocks."}
                </p>
              </div>
            </div>
          </div>

          <div className="table-container bg-white rounded-2xl border shadow-sm">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Bon</th>
                  <th>Source / Départ</th>
                  <th>Boutique / Arrivée</th>
                  <th>Date Envoi</th>
                  <th>Articles</th>
                  <th>Statut</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTransfers ? (
                  <TableLoading colSpan={7} />
                ) : transfers.length === 0 ? (
                  <TableEmpty colSpan={7} message={language === "fr" ? "Aucun bon de transfert enregistré" : "No transfers recorded"} icon={Truck} />
                ) : transfers.map((tVal: any) => {
                  return (
                    <tr key={tVal.id}>
                      <td className="font-bold text-blue-900 font-mono text-xs uppercase">#TR-{tVal.id.slice(-6)}</td>
                      <td className="text-xs font-semibold text-slate-800">🏭 {tVal.sourceWarehouse?.name}</td>
                      <td className="text-xs font-semibold text-blue-900">🏪 {tVal.destinationWarehouse?.name}</td>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(tVal.createdAt)}</td>
                      <td className="text-xs text-gray-700">
                        <span className="font-black bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full">{tVal.items?.length || 0}</span>
                      </td>
                      <td>
                        <span className={cn(
                          "font-bold uppercase text-[9px] px-2.5 py-1 rounded-full border inline-block text-center",
                          tVal.status === "COMPLETED" ? "bg-green-50 text-green-700 border-green-200" : "bg-orange-50 text-orange-700 border-orange-200"
                        )}>
                          {tVal.status === "PENDING" ? "⏳ En Transit" : "✅ Livré / Reçu"}
                        </span>
                      </td>
                      <td className="align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => setActiveTransferForPrint(tVal)}
                            className="btn-secondary p-2 text-xs flex items-center gap-1 font-semibold"
                            title="Imprimer le bon"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          
                          {tVal.status === "PENDING" && (
                            <button
                              onClick={() => handleReceive(tVal.id)}
                              disabled={isReceiving}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 text-xs rounded-xl flex items-center gap-1 transition-all shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Valider la réception</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forms & Modals */}
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

      {showWarehouseForm && <WarehouseForm onClose={() => setShowWarehouseForm(false)} />}
      {showTransferForm && <TransferForm onClose={() => setShowTransferForm(false)} warehouses={warehouses} />}
      {activeTransferForPrint && (
        <DeliveryNotePrintModal 
          transfer={activeTransferForPrint} 
          onClose={() => setActiveTransferForPrint(null)} 
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
