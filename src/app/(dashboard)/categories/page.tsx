"use client";
// src/app/(dashboard)/categories/page.tsx
import { useState } from "react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useQueries";
import { RefreshCw, Tags, Plus, Edit2, Trash2, X, AlertTriangle } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import { useForm } from "react-hook-form";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";

function CategoryForm({ category, onClose }: { category?: any, onClose: () => void }) {
  const { mutateAsync: createCat, isPending: isCreating } = useCreateCategory();
  const { mutateAsync: updateCat, isPending: isUpdating } = useUpdateCategory();
  const { addToast } = useUIStore();
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: category || { name: "", description: "", color: "#3B82F6" }
  });

  const onSubmit = async (data: any) => {
    try {
      if (category) {
        await updateCat({ id: category.id, data });
        addToast({ type: "success", title: "Catégorie mise à jour" });
      } else {
        await createCat(data);
        addToast({ type: "success", title: "Catégorie créée" });
      }
      onClose();
    } catch (err: any) {
      addToast({ type: "error", title: "Erreur", message: err.message || "Erreur lors de l'enregistrement" });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">{category ? "Modifier la catégorie" : "Nouvelle catégorie"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Nom de la catégorie *</label>
            <input {...register("name", { required: "Le nom est requis" })} className="input" placeholder="Ex: Électronique" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
          </div>
          <div>
            <label className="label">Couleur</label>
            <div className="flex gap-2 items-center">
              <input type="color" {...register("color")} className="w-12 h-10 p-1 border border-gray-300 rounded cursor-pointer" />
              <span className="text-sm text-gray-500">Code couleur hexadécimal</span>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register("description")} className="input h-24 resize-none" placeholder="Description..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary py-2 px-4">Annuler</button>
            <button type="submit" disabled={isPending} className="btn-primary py-2 px-4 flex items-center gap-2">
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {category ? "Mettre à jour" : "Créer"}
            </button>
          </div>
        </form>
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Supprimer la catégorie</h2>
          <p className="text-gray-500 text-sm">
            Voulez-vous supprimer <strong className="text-gray-900">"{item.name}"</strong> ?
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

export default function CategoriesPage() {
  const { data, isLoading, isFetching, refetch } = useCategories();
  const { mutateAsync: deleteCat, isPending: isDeleting } = useDeleteCategory();
  const { addToast } = useUIStore();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<{id: string, name: string} | null>(null);

  const categories = data?.data || [];

  const handleEdit = (cat: any) => {
    setEditingCat(cat);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingCat(null);
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    try {
      await deleteCat(deleteItem.id);
      addToast({ type: "success", title: "Catégorie supprimée" });
      setDeleteItem(null);
    } catch (err: any) {
      addToast({ type: "error", title: "Erreur", message: err.message });
      setDeleteItem(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
          <p className="text-gray-500 text-sm">{categories.length} catégorie(s) au total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2.5">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouvelle catégorie
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Couleur</th>
              <th>Nom</th>
              <th>Description</th>
              <th>Produits</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={5} />
            ) : categories.length === 0 ? (
              <TableEmpty colSpan={5} message="Aucune catégorie trouvée" icon={Tags} />
            ) : categories.map((cat: any) => (
              <tr key={cat.id}>
                <td className="w-16">
                  <div className="w-8 h-8 rounded-full border border-gray-200" style={{ backgroundColor: cat.color || "#ccc" }}></div>
                </td>
                <td className="font-semibold text-gray-900">{cat.name}</td>
                <td className="text-gray-500 max-w-xs truncate">{cat.description || "—"}</td>
                <td>
                  <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-medium">
                    {cat._count?.products || 0} produit(s)
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleEdit(cat)} title="Modifier" className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteItem({ id: cat.id, name: cat.name })} title="Supprimer" className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <CategoryForm category={editingCat} onClose={handleCloseForm} />}
      {deleteItem && <DeleteConfirmModal item={deleteItem} onClose={() => setDeleteItem(null)} onConfirm={confirmDelete} isPending={isDeleting} />}
    </div>
  );
}
