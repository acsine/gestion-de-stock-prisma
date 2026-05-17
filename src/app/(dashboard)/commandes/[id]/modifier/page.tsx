"use client";
// src/app/(dashboard)/commandes/[id]/modifier/page.tsx
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSuppliers, usePurchaseOrder, useUpdatePurchaseOrder, useSettings } from "@/hooks/useQueries";
import { useProducts } from "@/hooks/useProducts";
import { Plus, Trash2, Save, ArrowLeft, Loader2, Printer, Share2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function ModifierBonCommande({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const { data: orderData, isLoading: isOrderLoading } = usePurchaseOrder(id);
  const { data: suppliersData } = useSuppliers();
  const { data: productsData } = useProducts();
  const { data: settingsData } = useSettings();
  const updateOrder = useUpdatePurchaseOrder();

  const suppliers = suppliersData?.data || [];
  const products = productsData?.data || [];
  const settings = settingsData?.data || {};

  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [updatedOrder, setUpdatedOrder] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: ""
  });

  // Pre-load data from order
  useEffect(() => {
    if (orderData?.data) {
      const order = orderData.data;
      setSupplierId(order.supplierId || "");
      setNotes(order.notes || "");
      if (order.expectedAt) {
        setExpectedAt(new Date(order.expectedAt).toISOString().split("T")[0]);
      }
      if (order.items) {
        setItems(
          order.items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate
          }))
        );
      }
    }
  }, [orderData]);

  const supplierOptions = suppliers.map((s: any) => ({
    value: s.id,
    label: s.name,
    sub: s.city || s.phone
  }));

  const productOptions = products.map((p: any) => ({
    value: p.id,
    label: p.name,
    sub: `${p.sku} • Stock: ${p.currentStock}`
  }));

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0, taxRate: 19.25 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "productId") {
      const product = products.find((p: any) => p.id === value);
      if (product) {
        newItems[index].unitPrice = product.buyPrice;
        newItems[index].taxRate = product.taxRate;
      }
    }
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const tax = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate / 100)), 0);
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) {
      setErrorModal({
        isOpen: true,
        title: "Champs obligatoires manquants",
        message: "Veuillez sélectionner un fournisseur et ajouter au moins un article avec une quantité valide pour enregistrer le bon de commande."
      });
      return;
    }

    setIsSaving(true);
    try {
      const [res] = await Promise.all([
        updateOrder.mutateAsync({
          id,
          data: {
            supplierId,
            notes,
            expectedAt: expectedAt || undefined,
            items: items.map(i => ({
              productId: i.productId,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              taxRate: Number(i.taxRate)
            }))
          }
        }),
        new Promise(resolve => setTimeout(resolve, 800)) // Min delay for premium smooth feedback
      ]);
      setUpdatedOrder(res.data);
    } catch (error: any) {
      console.error(error);
      setErrorModal({
        isOpen: true,
        title: "Erreur d'enregistrement",
        message: error.message || "Une erreur est survenue lors de la mise à jour du bon de commande. Veuillez réessayer."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!updatedOrder) return;
    const shareData = {
      title: `Bon de Commande ${updatedOrder.number}`,
      text: `Bon de Commande ${updatedOrder.number} pour ${updatedOrder.supplier?.name}. Total: ${formatCurrency(updatedOrder.total)}`,
      url: window.location.origin + `/commandes/${updatedOrder.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Error sharing", err);
      }
    } else {
      alert("Le partage n'est pas supporté sur ce navigateur. Copiez l'URL.");
    }
  };

  // Loading view
  if (isOrderLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Chargement du bon de commande...</p>
      </div>
    );
  }

  // If order was received, prevent edit
  if (orderData?.data?.status === "RECU") {
    return (
      <div className="max-w-md mx-auto mt-20 card p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Modification impossible</h2>
        <p className="text-gray-500 text-sm">
          Le bon de commande <span className="font-mono font-bold">{orderData.data.number}</span> a déjà été réceptionné et les stocks ont été mis à jour.
        </p>
        <Link href="/commandes" className="btn-primary inline-block w-full py-2.5">
          Retour aux bons de commande
        </Link>
      </div>
    );
  }

  // SUCCESS VIEW
  if (updatedOrder) {
    return (
      <>
        {/* Success View Screen (Hidden on print) */}
        <div className="print:hidden flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in duration-300">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Bon de commande mis à jour !</h1>
            <p className="text-gray-500 max-w-md mx-auto">
              Le bon de commande <span className="font-mono font-bold text-blue-600">{updatedOrder.number}</span> a été modifié avec succès.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={handlePrint} className="btn-primary flex items-center gap-2 px-8 py-3">
              <Printer className="w-5 h-5" /> Imprimer le BC
            </button>
            <button onClick={handleShare} className="btn-secondary flex items-center gap-2 px-8 py-3">
              <Share2 className="w-5 h-5" /> Partager
            </button>
            <button onClick={() => router.push("/commandes")} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors pt-4 underline">
              Retour à la liste
            </button>
          </div>
        </div>

        {/* PRINT TEMPLATE (Hidden from UI, visible in print) */}
        <div className="hidden print:block bg-white p-10 text-black">
          <div className="flex justify-between border-b-2 border-gray-900 pb-8 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-blue-900 uppercase">{settings.company_name || "Boutique"}</h1>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{settings.company_address}</p>
              <p className="text-sm text-gray-600">{settings.company_phone} | {settings.company_email}</p>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-gray-300 uppercase leading-none mb-2">Bon de Commande</h2>
              <p className="text-xl font-mono font-bold">N° {updatedOrder.number}</p>
              <p className="text-sm">Date: {formatDate(updatedOrder.createdAt)}</p>
              {updatedOrder.expectedAt && <p className="text-sm font-bold text-red-600">Livraison prévue: {formatDate(updatedOrder.expectedAt)}</p>}
            </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg mb-8 border border-gray-200">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Fournisseur</h3>
            <p className="text-xl font-bold">{updatedOrder.supplier?.name}</p>
            <p className="text-sm">{updatedOrder.supplier?.address || updatedOrder.supplier?.city}</p>
            <p className="text-sm">{updatedOrder.supplier?.phone}</p>
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
              {updatedOrder.items.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-3 font-medium">{item.product?.name}</td>
                  <td className="py-3 text-center">{item.quantity} {item.product?.unit}</td>
                  <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 text-center">{item.taxRate}%</td>
                  <td className="py-3 text-right font-bold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm"><span>Sous-total HT:</span><span>{formatCurrency(updatedOrder.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span>Total TVA:</span><span>{formatCurrency(updatedOrder.taxAmount)}</span></div>
              <div className="flex justify-between text-xl font-black border-t-2 border-gray-900 pt-2">
                <span>TOTAL TTC:</span>
                <span>{formatCurrency(updatedOrder.total)}</span>
              </div>
            </div>
          </div>

          {updatedOrder.notes && (
            <div className="mt-10 p-4 border rounded text-sm italic text-gray-600">
              <strong>Notes:</strong> {updatedOrder.notes}
            </div>
          )}

          <div className="mt-20 flex justify-between">
            <div className="text-center w-48"><div className="border-t border-gray-400 pt-2 text-xs">Signature Fournisseur</div></div>
            <div className="text-center w-48"><div className="border-t border-gray-400 pt-2 text-xs">Cachet & Signature</div></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 print:hidden">
      <div className="flex items-center gap-4">
        <Link href="/commandes" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold font-heading">Modifier Bon de Commande</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="card p-6 overflow-visible">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
              Articles de la commande
            </h2>
            <div className="space-y-4">
              <div className="overflow-x-auto min-h-[350px]">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-3 pr-4">Produit</th>
                      <th className="pb-3 w-28 text-center">Qté</th>
                      <th className="pb-3 w-36 text-right">P.U Achat HT</th>
                      <th className="pb-3 w-24 text-center">TVA (%)</th>
                      <th className="pb-3 w-36 text-right">Total HT</th>
                      <th className="pb-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, index) => (
                      <tr key={index} className="group">
                        <td className="py-4 pr-4 relative focus-within:z-50">
                          <SearchableSelect
                            options={productOptions}
                            value={item.productId}
                            onChange={(val) => updateItem(index, "productId", val)}
                            placeholder="Sélectionner un produit..."
                            searchPlaceholder="Chercher par nom ou SKU..."
                            className="w-full min-w-[320px]"
                          />
                        </td>
                        <td className="py-4 px-2">
                          <input
                            type="number"
                            className="w-24 text-center font-medium h-10 px-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                            min="1"
                            required
                          />
                        </td>
                        <td className="py-4 px-2">
                          <input
                            type="number"
                            className="w-32 text-right font-medium h-10 px-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                            step="0.01"
                            required
                          />
                        </td>
                        <td className="py-4 px-2">
                          <input
                            type="number"
                            className="w-20 text-center text-gray-500 h-10 px-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white"
                            value={item.taxRate}
                            onChange={(e) => updateItem(index, "taxRate", Number(e.target.value))}
                            step="0.01"
                          />
                        </td>
                        <td className="py-4 text-right font-bold text-gray-900">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {items.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-gray-400">Aucun article ajouté à cette commande.</p>
                </div>
              )}

              <button
                type="button"
                onClick={addItem}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-medium"
              >
                <Plus className="w-4 h-4" /> Ajouter un article
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-gray-400 rounded-full"></span>
              Notes & Observations
            </h2>
            <textarea
              className="input w-full h-28 resize-none"
              placeholder="Instructions spéciales pour le fournisseur, conditions de livraison, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 space-y-5 overflow-visible">
            <h2 className="text-lg font-semibold">Détails</h2>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Fournisseur *</label>
              <SearchableSelect
                options={supplierOptions}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Choisir fournisseur..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Livraison prévue</label>
              <input
                type="date"
                className="input w-full"
                value={expectedAt}
                onChange={(e) => setExpectedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="card p-6 space-y-4 bg-gray-900 text-white">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Résumé financier</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Sous-total HT</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total TVA</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-800 flex justify-between items-baseline">
              <span className="text-sm font-medium text-gray-400">Total TTC</span>
              <span className="text-2xl font-bold text-blue-400">{formatCurrency(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving || items.length === 0}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span className="font-bold">Mettre à jour le Bon</span>
          </button>
        </div>
      </form>

      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{errorModal.title}</h2>
              <p className="text-gray-500 text-sm leading-relaxed">{errorModal.message}</p>
            </div>
            <div className="p-4 bg-gray-50 flex justify-center">
              <button
                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
