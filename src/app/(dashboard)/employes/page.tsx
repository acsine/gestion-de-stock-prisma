"use client";
// src/app/(dashboard)/employes/page.tsx
import { useState } from "react";
import { useEmployees, useCreateEmployee, useRoles } from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { UserCircle, Plus, RefreshCw, X, Search, Edit2, Trash2, Mail, Phone, MapPin, Briefcase, Calendar, Shield } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, type EmployeeInput } from "@/lib/validations";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  ACTIF: "badge-green", CONGE: "badge-yellow", SUSPENDU: "badge-yellow", LICENCIE: "badge-red",
};

function EmployeeForm({ onClose, initialData }: { onClose: () => void, initialData?: any }) {
  const qc = useQueryClient();
  const { addToast } = useUIStore();
  const { mutateAsync: createEmployee, isPending: isCreating } = useCreateEmployee();
  
  const { mutateAsync: updateEmployee, isPending: isUpdating } = useMutation({
    mutationFn: (data: any) => fetch(`/api/employees/${initialData.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialData ? {
      ...initialData,
      startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : "",
      dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split("T")[0] : "",
    } : { contractType: "CDI", startDate: new Date().toISOString().split("T")[0] },
  });

  const onSubmit = async (data: EmployeeInput) => {
    try {
      const res = initialData ? await updateEmployee(data) : await createEmployee(data);
      if (res.error) { addToast({ type: "error", title: "Erreur", message: typeof res.error === "string" ? res.error : "Une erreur est survenue" }); return; }
      addToast({ type: "success", title: initialData ? "Employé mis à jour" : "Employé créé" });
      onClose();
    } catch (e) {
      addToast({ type: "error", title: "Erreur", message: "Action impossible" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">{initialData ? "Modifier l'employé" : "Nouvel employé"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label">Prénom *</label>
              <input {...register("firstName")} className="input w-full" />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Nom *</label>
              <input {...register("lastName")} className="input w-full" />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("phone")} className="input w-full pl-10" placeholder="+237 6xx xxx xxx" />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("email")} type="email" className="input w-full pl-10" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label">Poste *</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("position")} className="input w-full pl-10" placeholder="Responsable stock…" />
              </div>
              {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position.message}</p>}
            </div>
            <div>
              <label className="label">Département</label>
              <input {...register("department")} className="input w-full" placeholder="Logistique, RH…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label">Type de contrat *</label>
              <Controller
                name="contractType"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={[
                      { value: "CDI", label: "CDI" },
                      { value: "CDD", label: "CDD" },
                      { value: "STAGE", label: "Stage" },
                      { value: "FREELANCE", label: "Freelance" }
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Sélectionner…"
                  />
                )}
              />
            </div>
            <div>
              <label className="label">Date d'embauche *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("startDate")} type="date" className="input w-full pl-10" />
              </div>
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Salaire de base brut (FCFA) *</label>
            <input {...register("baseSalary", { valueAsNumber: true })} type="number" className="input w-full" placeholder="0" />
            {errors.baseSalary && <p className="text-red-500 text-xs mt-1">{errors.baseSalary.message}</p>}
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3">Annuler</button>
            <button type="submit" disabled={isCreating || isUpdating} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-500/20">
              {(isCreating || isUpdating) ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {initialData ? "Enregistrer les modifications" : "Créer l'employé"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { data, isLoading, isFetching, refetch } = useEmployees({ search, status: statusFilter });
  const qc = useQueryClient();
  const { addToast } = useUIStore();

  const employees = data?.data || [];

  const { mutateAsync: deleteEmployee } = useMutation({
    mutationFn: (id: string) => fetch(`/api/employees/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      addToast({ type: "success", title: "Employé supprimé" });
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer l'employé ${name} ?`)) return;
    await deleteEmployee(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Personnel</h1>
          <p className="text-gray-500 text-sm">{employees.length} employé(s) enregistrés</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2.5">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2 text-sm px-4 font-bold shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" /> Nouvel employé
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-4 bg-white border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, email ou poste…" className="input pl-9 w-full" />
        </div>
        <SearchableSelect
          options={[
            { value: "ACTIF", label: "Actif" },
            { value: "CONGE", label: "En congé" },
            { value: "SUSPENDU", label: "Suspendu" },
            { value: "LICENCIE", label: "Licencié" }
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Tous statuts"
          allowAll
          allLabel="Tous statuts"
          className="w-full md:w-48"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Poste & Dpt</th>
              <th>Contrat</th>
              <th>Date embauche</th>
              <th className="text-right">Salaire base</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" /></td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400"><UserCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />Aucun employé trouvé</td></tr>
            ) : employees.map((emp: any) => (
              <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-blue-200">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{emp.firstName} {emp.lastName}</div>
                      {emp.email && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Mail className="w-3 h-3" /> {emp.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="font-medium text-sm text-gray-900">{emp.position}</div>
                  <div className="text-xs text-gray-500">{emp.department || "Général"}</div>
                </td>
                <td><span className="badge-blue text-[10px] font-black uppercase tracking-wider">{emp.contractType}</span></td>
                <td className="text-sm text-gray-500">{formatDate(emp.startDate)}</td>
                <td className="font-bold text-right text-gray-900">{formatCurrency(emp.baseSalary)}</td>
                <td><span className={`text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[emp.status] || "badge-gray"}`}>{emp.status}</span></td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingEmployee(emp)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(emp.id, `${emp.firstName} ${emp.lastName}`)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAddForm || editingEmployee) && (
        <EmployeeForm 
          onClose={() => { setShowAddForm(false); setEditingEmployee(null); }} 
          initialData={editingEmployee}
        />
      )}
    </div>
  );
}
