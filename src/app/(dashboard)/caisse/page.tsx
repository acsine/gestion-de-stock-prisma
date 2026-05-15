"use client";
// src/app/(dashboard)/caisse/page.tsx
import { useState, useRef, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCashAccounts, useCustomers, useSettings } from "@/hooks/useQueries";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency } from "@/lib/utils";
import { ScanLine, Plus, Minus, Trash2, ShoppingCart, Check, X, Search, CreditCard, Banknote, Camera, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

function Receipt({ invoice, settings }: { invoice: any; settings: any }) {
  if (!invoice) return null;
  const companyName = settings?.company_name || "ThaborSolution";
  const companyLogo = settings?.company_logo;

  return (
    <div className="print-only" style={{ width: "80mm", margin: "0 auto", padding: "10mm", fontFamily: "monospace", fontSize: "12px", color: "black", background: "white" }}>
      <div style={{ textAlign: "center", marginBottom: "15px" }}>
        {companyLogo && (
          <img src={companyLogo} alt="Logo" style={{ maxWidth: "40mm", maxHeight: "20mm", marginBottom: "5px" }} />
        )}
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>{companyName}</h2>
        <p style={{ margin: "2px 0" }}>{settings?.company_address || "Boutique Principale"}</p>
        <p style={{ margin: "2px 0" }}>Tél: {settings?.company_phone || "+237 XXX XXX XXX"}</p>
      </div>
      <div style={{ borderBottom: "1px dashed black", marginBottom: "10px", paddingBottom: "10px" }}>
        <p style={{ margin: "2px 0" }}>Ticket N°: {invoice.number}</p>
        <p style={{ margin: "2px 0" }}>Date: {new Date(invoice.issueDate || invoice.createdAt).toLocaleString("fr-FR")}</p>
        <p style={{ margin: "2px 0" }}>Caissier: {invoice.user?.name || "Caisse 1"}</p>
        {invoice.customer && invoice.customer.name !== "Client Divers" && (
          <p style={{ margin: "2px 0" }}>Client: {invoice.customer.name}</p>
        )}
      </div>
      <table style={{ width: "100%", marginBottom: "10px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px dashed black", textAlign: "left" }}>
            <th style={{ paddingBottom: "4px" }}>QTE</th>
            <th style={{ paddingBottom: "4px" }}>DESIGNATION</th>
            <th style={{ textAlign: "right", paddingBottom: "4px" }}>P.U</th>
            <th style={{ textAlign: "right", paddingBottom: "4px" }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item: any, i: number) => (
            <tr key={i}>
              <td style={{ paddingTop: "4px", verticalAlign: "top" }}>{item.quantity}</td>
              <td style={{ paddingTop: "4px" }}>{item.product?.name || item.description || "Article"}</td>
              <td style={{ textAlign: "right", paddingTop: "4px", verticalAlign: "top" }}>{item.unitPrice}</td>
              <td style={{ textAlign: "right", paddingTop: "4px", verticalAlign: "top" }}>{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ borderTop: "1px dashed black", paddingTop: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>Sous-total:</span>
          <span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        {invoice.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>Remise:</span>
            <span>-{formatCurrency(invoice.discount)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", marginTop: "8px" }}>
          <span>TOTAL:</span>
          <span>{formatCurrency(invoice.total)}</span>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: "20px", borderTop: "1px dashed black", paddingTop: "10px" }}>
        <p style={{ margin: "2px 0", fontStyle: "italic" }}>Merci de votre visite !</p>
        <p style={{ margin: "2px 0", fontSize: "10px" }}>Les articles vendus ne sont ni repris ni échangés.</p>
      </div>
    </div>
  );
}

interface CartItem {
  product: any;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export default function POSPage() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("ESPECES");
  const { data: settingsData } = useSettings();
  const settings = settingsData?.data;



  const searchInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useUIStore();
  const qc = useQueryClient();

  const { data: prodData, isLoading: isProductsLoading } = useProducts({ status: "ACTIF", pageSize: 1000 });
  const { data: accData } = useCashAccounts();
  const { data: custData } = useCustomers();

  const products = prodData?.data || [];
  const accounts = accData?.data || [];
  const customers = custData?.data || [];

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { videoRef, startScan, stopScan, cameras, activeCamera, setCamera, error: scannerError } = useBarcodeScanner((res) => {
    const product = products.find((p: any) => p.barcode === res.barcode || p.sku === res.barcode);
    if (product) {
      addToCart(product);
      addToast({ type: "success", title: "Produit ajouté", message: product.name });
    } else {
      addToast({ type: "error", title: "Code inconnu", message: res.barcode });
    }
  });

  const toggleScanner = async () => {
    if (showScanner) {
      stopScan();
      setShowScanner(false);
    } else {
      setShowScanner(true);
      await startScan();
    }
  };

  const { mutateAsync: processSale, isPending } = useMutation({
    mutationFn: (data: any) => fetch("/api/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Erreur de validation");
      }
      return r.json();
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    }
  });

  // Focus scanner on mount and after checkout
  useEffect(() => {
    if (!showCheckout && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showCheckout]);

  // Handle receipt printing
  useEffect(() => {
    if (receiptData) {
      // Small timeout to allow DOM to render the receipt before printing
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [receiptData]);

  // Reset receipt after print
  useEffect(() => {
    const handleAfterPrint = () => setReceiptData(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    const product = products.find((p: any) => p.barcode === barcode || p.sku === barcode);
    if (!product) {
      addToast({ type: "error", title: "Produit non trouvé", message: `Code: ${barcode}` });
      setBarcode("");
      return;
    }

    addToCart(product);
    setBarcode("");
  };

  const addToCart = (product: any) => {
    if (product.currentStock <= 0) {
      addToast({ type: "warning", title: "Rupture de stock", message: `Stock de ${product.name} est à 0.` });
      // Still allow adding to cart? Maybe prevent it.
      return;
    }

    setLastScanned(product);

    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          addToast({ type: "warning", title: "Stock max atteint" });
          return prev;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [{ product, quantity: 1, unitPrice: product.sellPrice, discount: 0 }, ...prev];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[index];
      const newQ = item.quantity + delta;
      
      if (newQ > item.product.currentStock) {
        addToast({ type: "warning", title: "Stock insuffisant", message: `Max: ${item.product.currentStock}` });
        return prev;
      }
      
      if (newQ > 0) {
        newCart[index] = { ...item, quantity: newQ };
      } else {
        newCart.splice(index, 1);
      }
      return newCart;
    });
  };

  const removeItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalDiscount = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discount / 100)), 0) + (subtotal * (globalDiscount / 100));
  const total = subtotal - totalDiscount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id); // Auto select first account if none selected
    }
    setShowCheckout(true);
  };

  const confirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      addToast({ type: "error", title: "Erreur", message: "Veuillez sélectionner un compte de caisse" });
      return;
    }

    try {
      const res = await processSale({
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.product.taxRate,
          discount: i.discount
        })),
        customerId: customerId || undefined,
        accountId,
        paymentMethod,
        globalDiscount
      });

      addToast({ type: "success", title: "Vente validée", message: "Ticket en cours d'impression..." });
      
      // The API returns the transaction result in `res.data`
      // But actually processSale returns { data: invoice } 
      // where `invoice` is what we returned from the tx in route.ts
      setReceiptData(res.data);

      setCart([]);
      setGlobalDiscount(0);
      setLastScanned(null);
      setCustomerId("");
      setShowCheckout(false);
    } catch (err: any) {
      addToast({ type: "error", title: "Erreur de validation", message: err.message });
    }
  };

  return (
    <>
    <style dangerouslySetInnerHTML={{__html: `
      @media print {
        body * { visibility: hidden; }
        .print-only, .print-only * { visibility: visible; }
        .print-only { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
        @page { margin: 0; }
      }
      @media screen {
        .print-only { display: none; }
      }
    `}} />
    
    <Receipt invoice={receiptData} settings={settings} />

    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] hide-on-print">
      {/* Left Column: Scanner and Products */}
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caisse (Point de Vente)</h1>
          <p className="text-sm text-gray-500">Scannez ou recherchez un produit pour l'ajouter au panier</p>
        </div>

        {/* Scanner Bar */}
        <div className="card p-4 flex gap-4 bg-blue-50 border-blue-100">
          <form onSubmit={handleScan} className="flex-1 relative">
            <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-600" />
            <input
              ref={searchInputRef}
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              placeholder="Scanner le code-barres ou taper le SKU..."
              className="w-full pl-12 pr-12 py-4 text-lg bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-mono"
              autoFocus
            />
            <button
              type="button"
              onClick={toggleScanner}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${showScanner ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600 hover:bg-blue-200"}`}
              title="Utiliser la caméra"
            >
              <Camera className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Scanner View */}
        {showScanner && (
          <div className="card overflow-hidden bg-black relative aspect-video sm:aspect-[16/9] max-h-64">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-2 border-blue-500/50 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-white/50 rounded-lg">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
              </div>
            </div>
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <select 
                value={activeCamera} 
                onChange={(e) => setCamera(e.target.value)}
                className="bg-black/60 text-white text-xs px-2 py-1 rounded border border-white/20 outline-none"
              >
                {cameras.map(c => (
                  <option key={c.deviceId} value={c.deviceId}>{c.label || `Caméra ${c.deviceId.slice(0,4)}`}</option>
                ))}
              </select>
              <button onClick={toggleScanner} className="bg-red-600 text-white p-2 rounded-full shadow-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {scannerError && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 text-center">
                <div className="text-white">
                  <X className="w-10 h-10 mx-auto text-red-500 mb-2" />
                  <p className="text-sm">{scannerError}</p>
                  <button onClick={toggleScanner} className="mt-4 text-xs underline">Fermer</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Last Scanned Info */}
        {lastScanned && (
          <div className="card p-4 border-l-4 border-l-green-500 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-mono">{lastScanned.barcode || lastScanned.sku}</p>
                <h3 className="font-bold text-lg">{lastScanned.name}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-blue-700">{formatCurrency(lastScanned.sellPrice)}</p>
              <p className="text-sm text-gray-500">Stock dispo: {lastScanned.currentStock}</p>
            </div>
          </div>
        )}

        {/* Manual Product Search (Alternative to scanner) */}
        <div className="card p-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 gap-4">
            <h3 className="font-bold flex items-center gap-2 whitespace-nowrap"><Search className="w-5 h-5 text-gray-400" /> Recherche manuelle</h3>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Rechercher par nom ou SKU..." 
              className="input py-1.5 text-sm w-full max-w-xs"
            />
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr>
                  <th className="py-2 text-gray-500 font-semibold border-b">Produit</th>
                  <th className="py-2 text-gray-500 font-semibold border-b text-right">Stock</th>
                  <th className="py-2 text-gray-500 font-semibold border-b text-right">Prix</th>
                  <th className="py-2 border-b w-10"></th>
                </tr>
              </thead>
              <tbody>
                {isProductsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-sm text-gray-400">Chargement des produits...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-gray-300">
                        <Search className="w-10 h-10 opacity-20" />
                        <p className="italic text-sm">Aucun produit trouvé</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.slice(0, 50).map((p: any) => (
                    <tr key={p.id} className="hover:bg-blue-50/50 border-b border-gray-100 last:border-0 transition-colors">
                      <td className="py-2.5 pr-2">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{p.sku}</div>
                      </td>
                      <td className="py-2.5 text-right px-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.currentStock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {p.currentStock}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-blue-700 px-2">{formatCurrency(p.sellPrice)}</td>
                      <td className="py-2.5 text-center pl-2">
                        <button 
                          onClick={() => addToCart(p)} 
                          disabled={p.currentStock <= 0}
                          className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                          title="Ajouter au panier"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Cart */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        <div className="card flex-1 flex flex-col overflow-hidden shadow-xl border-gray-200">
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Panier</h2>
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">{cart.length} articles</span>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                <p>Le panier est vide.</p>
                <p className="text-sm mt-1">Scannez un produit pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={index} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm pr-4 line-clamp-1">{item.product.name}</div>
                      <button onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                        <button onClick={() => updateQuantity(index, -1)} className="p-1 hover:bg-white rounded"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(index, 1)} className="p-1 hover:bg-white rounded"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="font-bold text-gray-900">{formatCurrency(item.unitPrice * item.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Checkout Button */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Remise</span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-end border-t pt-2">
              <span className="font-bold text-gray-700">Total à payer</span>
              <span className="text-3xl font-black text-blue-700">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full btn-primary py-4 text-lg mt-4 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-6 h-6" /> Compléter la vente
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 bg-blue-600 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6" /> Validation du paiement</h2>
              <button onClick={() => setShowCheckout(false)} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={confirmSale} className="p-6 space-y-6">
              
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 text-center shadow-inner">
                <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Montant total à encaisser</p>
                <p className="text-4xl font-black text-blue-900 drop-shadow-sm">{formatCurrency(total)}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight ml-1 mb-2 block">Client (Optionnel)</label>
                  <SearchableSelect
                    options={customers.map((c: any) => ({ value: c.id, label: c.name }))}
                    value={customerId}
                    onChange={setCustomerId}
                    placeholder="Sélectionner un client..."
                    allowAll
                    allLabel="Client Divers (Comptoir)"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight ml-1 mb-2 block">Mode de paiement *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "ESPECES", label: "Espèces", icon: Banknote, color: "blue" },
                      { id: "MOBILE_MONEY", label: "Mobile Money", icon: CreditCard, color: "purple" }
                    ].map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`py-4 flex flex-col items-center gap-2 border-2 rounded-2xl transition-all duration-200 shadow-sm
                          ${paymentMethod === method.id 
                            ? "border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-50 scale-[1.02]" 
                            : "border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"}`}
                      >
                        <div className={`p-2 rounded-xl ${paymentMethod === method.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                          <method.icon className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-sm">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight ml-1 mb-2 block">Caisse / Compte de destination *</label>
                  <SearchableSelect
                    options={accounts.map((a: any) => ({ value: a.id, label: a.name, sub: `Solde actuel: ${formatCurrency(a.balance)}` }))}
                    value={accountId}
                    onChange={setAccountId}
                    placeholder="Où va l'argent ?"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCheckout(false)} 
                  className="flex-1 px-4 py-3.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isPending || !accountId} 
                  className="flex-[2] btn-primary py-3.5 shadow-lg shadow-blue-200 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-6 h-6" />
                  )}
                  Valider l'encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
