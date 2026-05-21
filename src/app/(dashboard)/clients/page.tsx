"use client";
// src/app/(dashboard)/clients/page.tsx
import { useState } from "react";
import { useCustomers, useUpdateCustomer, useDeleteCustomer, useCreateCustomer } from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/locales/i18n";
import { Users, Plus, Search, RefreshCw, X, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@/lib/validations";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";

function DeleteConfirmModal({ onClose, onConfirm, name, isDeleting }: { onClose: () => void, onConfirm: () => void, name: string, isDeleting: boolean }) {
  const { t, language } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t.clients.modal.confirmDelete}</h3>
          <p className="text-gray-500">
            {language === "fr" ? (
              <>Êtes-vous sûr de vouloir supprimer <strong>{name}</strong> ? Cette action est irréversible.</>
            ) : (
              <>Are you sure you want to delete <strong>{name}</strong>? This action is irreversible.</>
            )}
          </p>
        </div>
        <div className="bg-gray-50 p-4 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5">{t.actions.cancel}</button>
          <button 
            onClick={onConfirm} 
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {language === "fr" ? "Supprimer" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerForm({ onClose, customer }: { onClose: () => void, customer?: any }) {
  const { t, language } = useTranslation();
  const { addToast } = useUIStore();
  const isEditing = !!customer;

  const { mutateAsync: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutateAsync: updateCustomer, isPending: isUpdating } = useUpdateCustomer();

  const { register, handleSubmit, control, formState: { errors } } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? {
      name: customer.name,
      type: customer.type,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      discount: customer.discount || 0,
      creditLimit: customer.creditLimit || 0,
      notes: customer.notes || "",
    } : { name: "", type: "PARTICULIER", discount: 0, creditLimit: 0, phone: "", email: "", city: "", notes: "", address: "" },
  });

  const onSubmit = async (data: CustomerInput) => {
    try {
      if (isEditing) {
        await updateCustomer({ id: customer.id, data });
        addToast({ type: "success", title: t.clients.modal.updateSuccess });
      } else {
        await createCustomer(data);
        addToast({ type: "success", title: t.clients.modal.saveSuccess });
      }
      onClose();
    } catch (err: any) {
      addToast({ type: "error", title: err.message || t.clients.modal.saveError });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">{isEditing ? t.clients.modal.editTitle : t.clients.modal.addTitle}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label className="label text-xs font-bold text-gray-400 uppercase tracking-widest">{t.clients.modal.name}</label>
              <input {...register("name")} className="input focus:ring-blue-500" placeholder="Ex: Jean Dupont" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label text-xs font-bold text-gray-400 uppercase tracking-widest">{t.clients.modal.type}</label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={[
                      { value: "PARTICULIER", label: language === "fr" ? "Particulier" : "Individual" },
                      { value: "ENTREPRISE", label: language === "fr" ? "Entreprise" : "Company" },
                      { value: "GROSSISTE", label: language === "fr" ? "Grossiste" : "Wholesaler" }
                    ]}
                    value={field.value || "PARTICULIER"}
                    onChange={field.onChange}
                    placeholder={language === "fr" ? "Sélectionner…" : "Select..."}
                  />
                )}
              />
            </div>
            <div>
              <label className="label text-xs font-bold text-gray-400 uppercase tracking-widest">{t.clients.modal.phone}</label>
              <input {...register("phone")} className="input focus:ring-blue-500" placeholder="6xx xxx xxx" />
            </div>
            <div>
              <label className="label text-xs font-bold text-gray-400 uppercase tracking-widest">{t.clients.modal.email}</label>
              <input {...register("email")} type="email" className="input focus:ring-blue-500" placeholder="email@exemple.com" />
            </div>
            <div>
              <label className="label text-xs font-bold text-gray-400 uppercase tracking-widest">{t.clients.modal.city}</label>
              <input {...register("city")} className="input focus:ring-blue-500" placeholder="Ex: Douala" />
            </div>
            <div>
              <label className="label text-xs font-bold text-gray-400 uppercase tracking-widest">{t.clients.modal.discount}</label>
              <input {...register("discount", { valueAsNumber: true })} type="number" min="0" max="100" className="input focus:ring-blue-500" placeholder="0" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="label text-xs font-bold text-gray-400 uppercase tracking-widest">{t.clients.modal.notes}</label>
              <textarea {...register("notes")} className="input focus:ring-blue-500 min-h-[80px] py-2" placeholder={t.clients.modal.notesPlaceholder} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary px-6">{t.actions.cancel}</button>
            <button 
              type="submit" 
              disabled={isPending} 
              className="btn-primary px-8 flex items-center justify-center gap-2 shadow-lg shadow-blue-100 min-w-[160px] transition-all disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.actions.saving}</span>
                </>
              ) : (
                <>
                  {isEditing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{isEditing ? t.clients.modal.saveChanges : t.clients.modal.createClient}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<any>(null);
  const { addToast } = useUIStore();
  
  const { data, isLoading, isFetching, refetch } = useCustomers({ search });
  const { mutateAsync: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();
  
  const customers = data?.data || [];
  const typeColors: Record<string, string> = { PARTICULIER: "badge-gray", ENTREPRISE: "badge-blue", GROSSISTE: "badge-green" };

  const confirmDelete = async () => {
    if (!deletingCustomer) return;
    try {
      const res = await deleteCustomer(deletingCustomer.id);
      if (res.error) {
        addToast({ type: "error", title: res.error });
      } else {
        addToast({ type: "success", title: t.clients.modal.deleteSuccess });
        setDeletingCustomer(null);
      }
    } catch (err) {
      addToast({ type: "error", title: t.clients.modal.deleteError });
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.clients.title} ({customers.length})</h1>
          <p className="text-sm text-gray-500">{t.clients.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2.5">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => { setEditingCustomer(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5 shadow-lg shadow-blue-100">
            <Plus className="w-4 h-4" /> {t.clients.addBtn}
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.clients.modal.searchPlaceholder} className="input pl-10 focus:ring-blue-500" />
        </div>
      </div>

      <div className="table-container shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <table className="data-table">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4">{t.clients.table.client}</th>
              <th className="px-4 py-4">{t.clients.table.type}</th>
              <th className="px-4 py-4">{t.clients.table.coords}</th>
              <th className="px-4 py-4 text-center">{t.clients.table.discount}</th>
              <th className="px-4 py-4 text-right">{t.clients.table.balance}</th>
              <th className="px-6 py-4 text-right">{t.actions.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <TableLoading colSpan={6} />
            ) : customers.length === 0 ? (
              <TableEmpty colSpan={6} message={t.clients.table.empty} icon={Users} />
            ) : customers.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50/30 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                <td className="px-4 py-4">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${typeColors[c.type]}`}>
                    {c.type === "PARTICULIER" ? (language === "fr" ? "Particulier" : "Individual") : c.type === "ENTREPRISE" ? (language === "fr" ? "Entreprise" : "Company") : (language === "fr" ? "Grossiste" : "Wholesaler")}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-700">{c.phone || "—"}</div>
                  <div className="text-[11px] text-gray-400">{c.email || "—"}</div>
                </td>
                <td className="px-4 py-4 text-center text-sm">
                  {c.discount > 0 ? <span className="text-green-600 font-black bg-green-50 px-2 py-1 rounded-lg">-{c.discount}%</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className={`px-4 py-4 text-right font-black ${c.balance < 0 ? "text-red-600" : "text-blue-700"}`}>
                  {formatCurrency(c.balance)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => { setEditingCustomer(c); setShowForm(true); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> {language === "fr" ? "Editer" : "Edit"}
                    </button>
                    <button 
                      onClick={() => setDeletingCustomer(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {language === "fr" ? "Supprimer" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CustomerForm 
          onClose={() => { setShowForm(false); setEditingCustomer(null); }} 
          customer={editingCustomer} 
        />
      )}

      {deletingCustomer && (
        <DeleteConfirmModal 
          name={deletingCustomer.name}
          isDeleting={isDeleting}
          onClose={() => setDeletingCustomer(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
