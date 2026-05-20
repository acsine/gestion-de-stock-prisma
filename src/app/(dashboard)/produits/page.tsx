"use client";
// src/app/(dashboard)/produits/page.tsx
import { useState, useRef } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useImportProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency, getStockStatus } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/validations";
import {
  Plus, Search, Upload, Download, Package, RefreshCw,
  Edit2, Trash2, X, ChevronDown, Filter, FileText, Eye, AlertTriangle, Camera, ImageIcon, Check
} from "lucide-react";
import { downloadReport } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";

const UNITS = ["Pièce","Kg","Litre","Boîte","Carton","Sac","Bidon","Mètre","m²","m³"];
const TAX_RATES = [0, 5.5, 9, 10, 19.25, 20];

function ProductForm({ onClose, categories, product, suppliers, hasUnsynced }: { onClose: () => void; categories: any[]; product?: any; suppliers?: any[]; hasUnsynced?: boolean }) {
  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { addToast } = useUIStore();
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product || { taxRate: 19.25, unit: "Pièce", status: "ACTIF", minStock: 5, maxStock: 100 },
  });
  const isPending = isCreating || isUpdating;
  const [uploading, setUploading] = useState(false);
  const imageUrl = watch("imageUrl");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData }).then(r => r.json());
      if (res.url) {
        setValue("imageUrl", res.url);
        addToast({ type: "success", title: "Image chargée" });
      } else {
        addToast({ type: "error", title: "Erreur d'upload", message: res.error });
      }
    } catch {
      addToast({ type: "error", title: "Erreur de connexion" });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProductInput) => {
    try {
      if (product) {
        await updateProduct({ id: product.id, data });
        addToast({ type: "success", title: "Produit mis à jour !" });
      } else {
        await createProduct(data);
        addToast({ type: "success", title: "Produit créé !" });
      }
      onClose();
    } catch (res: any) {
      addToast({ type: "error", title: "Erreur", message: "Une erreur est survenue" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">{product ? "Modifier le produit" : "Nouveau produit"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Image Upload Section */}
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors relative group">
            {imageUrl ? (
              <div className="relative w-32 h-32">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-xl shadow-md" />
                <button 
                  type="button" 
                  onClick={() => setValue("imageUrl", "")}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer w-full py-4">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  {uploading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
                </div>
                <span className="text-sm font-medium text-gray-600">Ajouter une photo</span>
                <span className="text-xs text-gray-400 mt-1">PNG, JPG ou GIF (max 5MB)</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">SKU / Référence *</label>
              <input {...register("sku")} className="input" placeholder="PROD-001" />
              {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
            </div>
            <div>
              <label className="label">Nom du produit *</label>
              <input {...register("name")} className="input" placeholder="Nom du produit" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie *</label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Sélectionner une catégorie…"
                    searchPlaceholder="Rechercher une catégorie…"
                  />
                )}
              />
              {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
            </div>
            <div>
              <label className="label">Unité</label>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={UNITS.map((u) => ({ value: u, label: u }))}
                    value={field.value || "Pièce"}
                    onChange={field.onChange}
                    placeholder="Sélectionner…"
                  />
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Prix achat (FCFA) *</label>
              <input {...register("buyPrice", { valueAsNumber: true })} type="number" className="input" placeholder="0" />
              {errors.buyPrice && <p className="text-red-500 text-xs mt-1">{errors.buyPrice.message}</p>}
            </div>
            <div>
              <label className="label">Prix vente (FCFA) *</label>
              <input {...register("sellPrice", { valueAsNumber: true })} type="number" className="input" placeholder="0" />
              {errors.sellPrice && <p className="text-red-500 text-xs mt-1">{errors.sellPrice.message}</p>}
            </div>
            <div>
              <label className="label">TVA (%)</label>
              <Controller
                name="taxRate"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={TAX_RATES.map((r) => ({ value: String(r), label: `${r}%` }))}
                    value={String(field.value ?? 19.25)}
                    onChange={(v) => field.onChange(parseFloat(v))}
                    placeholder="TVA…"
                  />
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Stock min</label>
              <input {...register("minStock", { valueAsNumber: true })} type="number" className="input" placeholder="5" />
            </div>
            <div>
              <label className="label">Stock max</label>
              <input {...register("maxStock", { valueAsNumber: true })} type="number" className="input" placeholder="100" />
            </div>
            <div>
              <label className="label">Emplacement</label>
              <input {...register("location")} className="input" placeholder="Rayon A-1" />
            </div>
          </div>
          <div>
            <label className="label">Code-barres</label>
            <input {...register("barcode")} className="input" placeholder="Laisser vide pour générer auto." />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register("description")} className="input h-20 resize-none" placeholder="Description optionnelle…" />
          </div>
          {!product && hasUnsynced && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs w-full">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                La création de produit est temporairement désactivée car des modifications locales ne sont pas synchronisées.
              </span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button 
              type="submit" 
              disabled={isPending || (!product && hasUnsynced)} 
              className="btn-primary flex items-center justify-center gap-2 min-w-[140px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  {product ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{product ? "Mettre à jour" : "Créer le produit"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductDetailsModal({ product, onClose }: { product: any, onClose: () => void }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b bg-gray-50">
          <h2 className="text-lg font-bold flex items-center gap-2"><Package className="w-5 h-5 text-blue-600"/> Détails du produit</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {product.imageUrl && (
            <div className="w-full h-48 overflow-hidden rounded-xl border border-gray-200 mb-4">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold">{product.name}</h3>
            <p className="text-sm text-gray-500 font-mono mt-1">SKU: {product.sku} | Code-barres: {product.barcode || "N/A"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Catégorie</p>
              <p className="font-medium mt-0.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: product.category?.color || "#ccc" }}></span>
                {product.category?.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Statut</p>
              <p className="font-medium mt-0.5">{product.status}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Prix d'Achat</p>
              <p className="font-medium mt-0.5">{formatCurrency(product.buyPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Prix de Vente</p>
              <p className="font-medium text-blue-700 mt-0.5">{formatCurrency(product.sellPrice)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Stock Actuel</p>
              <p className="font-bold text-lg mt-0.5">{product.currentStock} <span className="text-sm font-normal text-gray-500">{product.unit}</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Min</p>
              <p className="font-medium mt-0.5">{product.minStock}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Max</p>
              <p className="font-medium mt-0.5">{product.maxStock}</p>
            </div>
          </div>
          {product.description && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase font-bold">Description</p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ item, onClose, onConfirm, isPending }: { item: {id: string, name: string}, onClose: () => void, onConfirm: () => void, isPending: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Confirmer la suppression</h2>
          <p className="text-gray-500 text-sm">
            Êtes-vous sûr de vouloir supprimer le produit <strong className="text-gray-900">"{item.name}"</strong> ? Cette action est irréversible.
          </p>
        </div>
        <div className="p-4 bg-gray-50 flex gap-3">
          <button onClick={onClose} disabled={isPending} className="flex-1 btn-secondary py-2.5">Annuler</button>
          <button onClick={onConfirm} disabled={isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors py-2.5 flex items-center justify-center gap-2">
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProduitsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [viewProduct, setViewProduct] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<{id: string, name: string} | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addToast } = useUIStore();

  const { data, isLoading, isFetching, refetch } = useProducts({ search, categoryId: categoryFilter, status: statusFilter });
  const { data: catData } = useCategories();
  const { mutateAsync: importProducts } = useImportProducts();
  const { mutateAsync: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  const products = data?.data || [];
  const categories = catData?.data || [];
  const hasUnsynced = products.some((p: any) => p.isSynced === false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const res = await importProducts(file);
      addToast({ type: "success", title: "Import terminé", message: res.message });
    } catch {
      addToast({ type: "error", title: "Erreur d'import" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExport = async (format: "excel" | "word") => {
    setExportLoading(format);
    try {
      await downloadReport({ type: "stock", format }, "rapport-stock");
      addToast({ type: "success", title: "Rapport exporté" });
    } catch {
      addToast({ type: "error", title: "Erreur d'export" });
    } finally {
      setExportLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    const res = await deleteProduct(deleteItem.id);
    if (res.error) addToast({ type: "error", title: "Erreur", message: res.error });
    else addToast({ type: "success", title: "Produit supprimé" });
    setDeleteItem(null);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingProduct(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-gray-500 text-sm">{data?.total || 0} produit(s) au total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("excel")}
            disabled={exportLoading === "excel"}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {exportLoading === "excel" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Excel
          </button>
          <button
            onClick={() => handleExport("word")}
            disabled={exportLoading === "word"}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {exportLoading === "word" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Word
          </button>
          <input type="file" ref={fileRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importer Excel
          </button>
          <button 
            onClick={() => setShowForm(true)} 
            disabled={hasUnsynced}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Nouveau produit
          </button>
        </div>
      </div>

      {hasUnsynced && (
        <div className="flex items-center justify-between gap-3 text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm shadow-sm transition-all duration-300 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-amber-900">Synchronisation requise</span>
              <p className="text-xs text-amber-700 mt-0.5">
                Certains produits locaux ne sont pas synchronisés avec la version en ligne. La création de nouveaux produits est temporairement désactivée.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              setSyncingNow(true);
              try {
                const { SyncService } = await import("@/lib/sync-service");
                await SyncService.syncAll();
                await refetch();
                addToast({ type: "success", title: "Synchronisation réussie !" });
              } catch (e: any) {
                addToast({ type: "error", title: "Erreur de synchronisation", message: e.message });
              } finally {
                setSyncingNow(false);
              }
            }}
            disabled={syncingNow}
            className="btn-primary text-xs bg-amber-600 hover:bg-amber-700 text-white border-none py-2 px-3 whitespace-nowrap flex items-center gap-1.5 shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? "animate-spin" : ""}`} />
            {syncingNow ? "Synchronisation..." : "Synchroniser maintenant"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom ou SKU…" className="input pl-9" />
        </div>
        <SearchableSelect
          options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="Toutes catégories"
          searchPlaceholder="Rechercher catégorie…"
          allowAll
          allLabel="Toutes catégories"
          className="w-48"
        />
        <SearchableSelect
          options={[
            { value: "ACTIF", label: "Actif" },
            { value: "INACTIF", label: "Inactif" },
            { value: "ARCHIVE", label: "Archivé" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Tous statuts"
          allowAll
          allLabel="Tous statuts"
          className="w-40"
        />
        <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Stock</th>
              <th>Prix achat</th>
              <th>Prix vente</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={8} />
            ) : products.length === 0 ? (
              <TableEmpty colSpan={8} message="Aucun produit trouvé" icon={Package} />
            ) : products.map((p: any) => {
              const stockStatus = getStockStatus(p.currentStock, p.minStock, p.maxStock);
              return (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-gray-500">{p.sku}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        {p.location && <div className="text-xs text-gray-400">{p.location}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ background: p.category?.color || "#ccc" }} />
                      {p.category?.name}
                    </span>
                  </td>
                  <td>
                    <div className="font-medium">{p.currentStock} {p.unit}</div>
                    <span className={`text-xs ${stockStatus.class}`}>{stockStatus.label}</span>
                  </td>
                  <td className="text-right font-medium">{formatCurrency(p.buyPrice)}</td>
                  <td className="text-right font-semibold text-blue-700">{formatCurrency(p.sellPrice)}</td>
                  <td>
                    <span className={p.status === "ACTIF" ? "badge-green" : "badge-gray"}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button title="Détails" onClick={() => setViewProduct(p)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button title="Modifier" onClick={() => handleEdit(p)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button title="Supprimer" onClick={() => setDeleteItem({ id: p.id, name: p.name })} className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && <ProductForm onClose={handleCloseForm} product={editingProduct} categories={categories} hasUnsynced={hasUnsynced} />}
      {viewProduct && <ProductDetailsModal product={viewProduct} onClose={() => setViewProduct(null)} />}
      {deleteItem && <DeleteConfirmModal item={deleteItem} onClose={() => setDeleteItem(null)} onConfirm={confirmDelete} isPending={isDeleting} />}
    </div>
  );
}
