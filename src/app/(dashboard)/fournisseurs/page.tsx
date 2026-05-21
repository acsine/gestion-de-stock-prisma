"use client";
// src/app/(dashboard)/fournisseurs/page.tsx
import { useState } from "react";
import { useSuppliers, useUpdateSupplier, useDeleteSupplier } from "@/hooks/useQueries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency } from "@/lib/utils";
import { Building2, Plus, Search, RefreshCw, X, Loader2, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema } from "@/lib/validations";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";
import { usePermissions } from "@/components/auth/HasPermission";
import { useTranslation } from "@/locales/i18n";
import { PhoneInputWithValidation } from "@/components/ui/PhoneInputWithValidation";
import { parsePhoneNumberFromString } from "libphonenumber-js";


function SupplierForm({ supplier, onClose, onEditSuccess }: { supplier?: any; onClose: () => void; onEditSuccess?: (name: string) => void }) {
  const qc = useQueryClient();
  const { addToast } = useUIStore();
  const { language, t } = useTranslation();
  
  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
  
  const updateMutation = useUpdateSupplier();
  
  const isPending = createMutation.isPending || updateMutation.isPending;
  
  const { register, handleSubmit, control, formState: { errors } } = useForm<any>({ 
    resolver: zodResolver(supplierSchema), 
    defaultValues: supplier ? {
      name: supplier.name || "",
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      city: supplier.city || "",
      address: supplier.address || "",
      isActive: supplier.isActive ?? true,
      paymentTerms: supplier.paymentTerms || 30
    } : { paymentTerms: 30, isActive: true } 
  });

  const onSubmit = async (data: any) => {
    try {
      if (supplier) {
        const res = await updateMutation.mutateAsync({ id: supplier.id, data });
        if (res.error) {
          addToast({ type: "error", title: "Erreur", message: res.error });
          return;
        }
        addToast({ type: "success", title: "Fournisseur mis à jour", message: "Les modifications ont été enregistrées." });
        if (onEditSuccess) {
          onEditSuccess(data.name);
        }
      } else {
        const res = await createMutation.mutateAsync(data);
        if (res.error) { 
          addToast({ type: "error", title: "Erreur", message: res.error }); 
          return; 
        }
        addToast({ type: "success", title: "Fournisseur créé", message: "Le nouveau fournisseur a été ajouté." });
        onClose();
      }
    } catch (err: any) {
      addToast({ type: "error", title: "Erreur", message: err.message || "Une erreur est survenue." });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all duration-300 scale-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {supplier ? `✏️ ${t.suppliers.modal.editTitle}` : `🏢 ${t.suppliers.modal.addTitle}`}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label className="label text-xs font-bold text-gray-500 uppercase">{language === "fr" ? "Raison sociale *" : "Company Name *"}</label>
              <input {...register("name")} className="input" placeholder="Ex: Ets Thabor & Fils" />
            </div>
            <div>
              <label className="label text-xs font-bold text-gray-500 uppercase">{language === "fr" ? "Contact principal" : "Primary Contact"}</label>
              <input {...register("contactName")} className="input" placeholder="Ex: Jean Dupont" />
            </div>
            <div>
              <label className="label text-xs font-bold text-gray-500 uppercase">{language === "fr" ? "Téléphone" : "Phone"}</label>
              <Controller
                name="phone"
                control={control}
                rules={{
                  validate: (val) => {
                    if (!val) return true; // Optional, so allow empty values
                    const parsed = parsePhoneNumberFromString(val);
                    return (parsed && parsed.isValid()) || (language === "fr" ? "Numéro de téléphone invalide" : "Invalid phone number");
                  }
                }}
                render={({ field, fieldState: { error } }) => (
                  <PhoneInputWithValidation
                    value={field.value || ""}
                    onChange={field.onChange}
                    error={error?.message}
                    placeholder="Ex: 699 99 99 99"
                  />
                )}
              />
            </div>
            <div>
              <label className="label text-xs font-bold text-gray-500 uppercase">Email</label>
              <input {...register("email")} type="email" className="input" placeholder="Ex: contact@thabor.com" />
            </div>
            <div>
              <label className="label text-xs font-bold text-gray-500 uppercase">{language === "fr" ? "Ville" : "City"}</label>
              <input {...register("city")} className="input" placeholder="Ex: Douala" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="label text-xs font-bold text-gray-500 uppercase">{language === "fr" ? "Adresse" : "Address"}</label>
              <input {...register("address")} className="input" placeholder="Ex: Rue 123, Akwa" />
            </div>
            {supplier && (
              <div>
                <label className="label text-xs font-bold text-gray-500 uppercase">{language === "fr" ? "Statut" : "Status"}</label>
                <select 
                  {...register("isActive", { setValueAs: (v) => v === "true" })}
                  className="input"
                >
                  <option value="true">{language === "fr" ? "Actif" : "Active"}</option>
                  <option value="false">{language === "fr" ? "Inactif" : "Inactive"}</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-500/10">
            <button type="button" onClick={onClose} className="btn-secondary">{t.actions.cancel}</button>
            <button 
              type="submit" 
              disabled={isPending} 
              className="btn-primary flex items-center justify-center gap-2 min-w-[120px] transition-all disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === "fr" ? "Enregistrement..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  {supplier ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{supplier ? t.actions.edit : t.actions.add}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuccessSupplierModal({ supplierName, onClose }: { supplierName: string; onClose: () => void }) {
  const { language } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all duration-300 scale-100 p-6 text-center space-y-4 border border-green-50">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900">{language === "fr" ? "Mise à jour réussie !" : "Update successful!"}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            {language === "fr" ? "Les informations de " : "The information of "}
            <span className="font-semibold text-gray-900">{supplierName}</span>
            {language === "fr" ? " ont été modifiées avec succès." : " has been successfully updated."}
          </p>
        </div>
        <button
          onClick={onClose}
          className="btn-primary w-full py-2.5 font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all"
        >
          {language === "fr" ? "Super, merci !" : "Awesome, thanks!"}
        </button>
      </div>
    </div>
  );
}

function DeleteSupplierModal({ supplier, onClose, onConfirm, isPending }: { supplier: any, onClose: () => void, onConfirm: () => void, isPending: boolean }) {
  const { language, t } = useTranslation();
  if (!supplier) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-red-500">🗑️</span> {language === "fr" ? "Confirmer la suppression" : "Confirm deletion"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-gray-600 text-sm leading-relaxed">
            {language === "fr" ? "Êtes-vous sûr de vouloir supprimer le fournisseur " : "Are you sure you want to delete supplier "}
            <span className="font-bold text-gray-900">{supplier.name}</span> ?
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
            <div className="flex gap-2">
              <span className="text-amber-600">⚠️</span>
              <p className="text-xs text-amber-700 font-medium">
                {language === "fr" 
                  ? "Cette action est irréversible. Le fournisseur ne pourra pas être supprimé s'il a des bons de commande ou transactions liés dans le système."
                  : "This action is irreversible. The supplier cannot be deleted if there are any linked purchase orders or system transactions."}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary text-sm">
            {t.actions.cancel}
          </button>
          <button 
            onClick={onConfirm} 
            disabled={isPending}
            className="btn-danger flex items-center gap-2 text-sm px-4 py-2 font-semibold shadow-sm min-w-[120px] justify-center"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t.actions.delete}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FournisseursPage() {
  const { hasPermission } = usePermissions();
  const { language, t } = useTranslation();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<any>(null);
  const [successSupplierName, setSuccessSupplierName] = useState<string | null>(null);

  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useSuppliers({ search });
  const deleteMutation = useDeleteSupplier();
  const { addToast } = useUIStore();

  const suppliers = data?.data || [];

  const handleDeleteConfirm = async () => {
    if (!deleteSupplier) return;
    try {
      await deleteMutation.mutateAsync(deleteSupplier.id);
      addToast({ 
        type: "success", 
        title: language === "fr" ? "Suppression réussie" : "Deletion successful", 
        message: language === "fr" ? `Le fournisseur ${deleteSupplier.name} a été supprimé.` : `Supplier ${deleteSupplier.name} has been deleted.`
      });
      setDeleteSupplier(null);
      setDeletingSupplierId(null);
    } catch (err: any) {
      addToast({ 
        type: "error", 
        title: language === "fr" ? "Erreur de suppression" : "Deletion error", 
        message: err.message || (language === "fr" ? "Impossible de supprimer le fournisseur." : "Could not delete supplier.")
      });
      setDeletingSupplierId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.suppliers.title}</h1>
          <p className="text-gray-500 text-sm">
            {suppliers.length} {language === "fr" ? "fournisseur(s) enregistré(s)" : "supplier(s) registered"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2.5">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          {hasPermission("suppliers.create") && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> {t.suppliers.addBtn}
            </button>
          )}
        </div>
      </div>
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder={language === "fr" ? "Rechercher par raison sociale ou contact principal..." : "Search by supplier name or primary contact..."} 
            className="input pl-9" 
          />
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t.suppliers.table.name}</th>
              <th>{t.suppliers.table.contact}</th>
              <th>{t.suppliers.table.phone}</th>
              <th>{t.suppliers.table.city}</th>
              <th className="text-right">{t.suppliers.table.balance}</th>
              <th>{t.suppliers.table.status}</th>
              <th className="text-right">{t.actions.actions}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <TableEmpty colSpan={7} message={language === "fr" ? "Aucun fournisseur trouvé" : "No suppliers found"} icon={Building2} />
            ) : suppliers.map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="font-semibold text-gray-900">{s.name}</td>
                <td className="text-sm text-gray-500">{s.contactName || "—"}</td>
                <td className="text-sm text-gray-500 font-mono">{s.phone || "—"}</td>
                <td className="text-sm text-gray-500">{s.city || "—"}</td>
                <td className={`font-bold text-right ${s.balance > 0 ? "text-orange-600" : "text-gray-900"}`}>
                  {formatCurrency(s.balance)}
                </td>
                <td>
                  <span className={s.isActive ? "badge-green" : "badge-gray"}>
                    {s.isActive ? (language === "fr" ? "Actif" : "Active") : (language === "fr" ? "Inactif" : "Inactive")}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Edit Button */}
                    {hasPermission("suppliers.edit") && (
                      <button
                        onClick={() => {
                          setEditingSupplierId(s.id);
                          setEditSupplier(s);
                          setTimeout(() => setEditingSupplierId(null), 300);
                        }}
                        disabled={editingSupplierId !== null || deletingSupplierId !== null}
                        className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-all disabled:opacity-40"
                        title={language === "fr" ? "Modifier le fournisseur" : "Edit supplier"}
                      >
                        {editingSupplierId === s.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        ) : (
                          <Edit2 className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Delete Button */}
                    {hasPermission("suppliers.delete") && (
                      <button
                        onClick={() => {
                          setDeletingSupplierId(s.id);
                          setDeleteSupplier(s);
                        }}
                        disabled={editingSupplierId !== null || deletingSupplierId !== null}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all disabled:opacity-40"
                        title="Supprimer le fournisseur"
                      >
                        {deletingSupplierId === s.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showForm && <SupplierForm onClose={() => setShowForm(false)} />}
      
      {editSupplier && (
        <SupplierForm 
          supplier={editSupplier} 
          onClose={() => setEditSupplier(null)} 
          onEditSuccess={(name) => {
            setEditSupplier(null);
            setSuccessSupplierName(name);
          }}
        />
      )}
      
      {successSupplierName && (
        <SuccessSupplierModal 
          supplierName={successSupplierName}
          onClose={() => setSuccessSupplierName(null)}
        />
      )}
      
      {deleteSupplier && (
        <DeleteSupplierModal 
          supplier={deleteSupplier} 
          isPending={deleteMutation.isPending}
          onClose={() => {
            setDeleteSupplier(null);
            setDeletingSupplierId(null);
          }} 
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
