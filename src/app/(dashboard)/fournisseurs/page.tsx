"use client";
// src/app/(dashboard)/fournisseurs/page.tsx
import { useState } from "react";
import { useSuppliers } from "@/hooks/useQueries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency } from "@/lib/utils";
import { Building2, Plus, Search, RefreshCw, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, type SupplierInput } from "@/lib/validations";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";

function SupplierForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { addToast } = useUIStore();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: SupplierInput) => fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
  const { register, handleSubmit } = useForm<SupplierInput>({ resolver: zodResolver(supplierSchema), defaultValues: { paymentTerms: 30 } });
  const onSubmit = async (data: SupplierInput) => {
    const res = await mutateAsync(data);
    if (res.error) { addToast({ type: "error", title: "Erreur" }); return; }
    addToast({ type: "success", title: "Fournisseur créé" });
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">Nouveau fournisseur</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label className="label">Raison sociale *</label>
              <input {...register("name")} className="input" />
            </div>
            <div>
              <label className="label">Contact principal</label>
              <input {...register("contactName")} className="input" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input {...register("phone")} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register("email")} type="email" className="input" />
            </div>
            <div>
              <label className="label">Ville</label>
              <input {...register("city")} className="input" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="label">Adresse</label>
              <input {...register("address")} className="input" />
            </div>
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
                  <span>Créer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FournisseursPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isFetching, refetch } = useSuppliers({ search });
  const suppliers = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fournisseurs ({suppliers.length})</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nouveau fournisseur
          </button>
        </div>
      </div>
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="input pl-9" />
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>Fournisseur</th><th>Contact</th><th>Téléphone</th><th>Ville</th><th>Solde dû</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={6} />
            ) : suppliers.length === 0 ? (
              <TableEmpty colSpan={6} message="Aucun fournisseur trouvé" icon={Building2} />
            ) : suppliers.map((s: any) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td className="text-sm text-gray-500">{s.contactName || "—"}</td>
                <td className="text-sm text-gray-500">{s.phone || "—"}</td>
                <td className="text-sm text-gray-500">{s.city || "—"}</td>
                <td className={`font-medium ${s.balance > 0 ? "text-orange-600" : "text-gray-900"}`}>{formatCurrency(s.balance)}</td>
                <td><span className={s.isActive ? "badge-green" : "badge-gray"}>{s.isActive ? "Actif" : "Inactif"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <SupplierForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
