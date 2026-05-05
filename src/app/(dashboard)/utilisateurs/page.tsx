"use client";
// src/app/(dashboard)/utilisateurs/page.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useUIStore } from "@/stores/useUIStore";
import { cn, formatDate } from "@/lib/utils";
import { Users, Plus, RefreshCw, X, Shield, Settings2, ShieldCheck, Mail, Calendar, Power } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema } from "@/lib/validations";
import { z } from "zod";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import Link from "next/link";
import { useRoles } from "@/hooks/useQueries";

type UserInput = z.infer<typeof userSchema>;

function UserForm({ onClose, roles }: { onClose: () => void, roles: any[] }) {
  const qc = useQueryClient();
  const { addToast } = useUIStore();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: any) => fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserInput) => {
    const res = await mutateAsync(data);
    if (res.error) { addToast({ type: "error", title: "Erreur", message: typeof res.error === "string" ? res.error : "Erreur" }); return; }
    addToast({ type: "success", title: "Utilisateur créé" });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nouvel utilisateur</h2>
            <p className="text-xs text-gray-500">Créez un compte pour un employé</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Nom complet *</label>
            <input {...register("name")} className="input w-full" placeholder="ex: Jean Dupont" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email *</label>
            <input {...register("email")} type="email" className="input w-full" placeholder="jean.dupont@entreprise.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Mot de passe initial *</label>
            <input {...register("password")} type="password" className="input w-full" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">Attribuer un Rôle *</label>
            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={roles.map(r => ({ value: r.id, label: r.name, sub: r.description }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choisir un rôle..."
                />
              )}
            />
            {errors.roleId && <p className="text-red-500 text-xs mt-1">{errors.roleId.message}</p>}
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-500/20">
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Créer le compte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UtilisateursPage() {
  const { data: session } = useSession();
  const { addToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then(r => r.json()),
  });
  const { data: rolesData } = useRoles();
  const roles = rolesData?.data || [];
  const users = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-500 text-sm">Contrôlez les accès et la sécurité de la plateforme</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/utilisateurs/roles" className="btn-secondary flex items-center gap-2 text-sm px-4">
            <Settings2 className="w-4 h-4" /> Gérer les Rôles
          </Link>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm px-4 font-bold shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" /> Nouvel utilisateur
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Contact</th>
              <th>Rôle assigné</th>
              <th>Dernière activité</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" />Aucun compte utilisateur trouvé</td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-blue-200">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{u.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">ID: {u.id.substring(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td className="text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Mail className="w-3.5 h-3.5" /> {u.email}
                  </div>
                </td>
                <td>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                    u.role?.name === "ADMIN" ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-blue-50 text-blue-700 border-blue-100"
                  )}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {u.role?.name || "Sans rôle"}
                  </div>
                </td>
                <td>
                  <div className="text-xs text-gray-500 flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {u.lastLogin ? formatDate(u.lastLogin) : "Jamais connecté"}
                    </div>
                  </div>
                </td>
                <td>
                  <button 
                    onClick={async () => {
                      if (u.id === (session?.user as any)?.id) return addToast({ type: "error", title: "Action interdite", message: "Vous ne pouvez pas vous désactiver vous-même" });
                      if (!confirm(`Voulez-vous ${u.isActive ? 'désactiver' : 'activer'} cet utilisateur ?`)) return;
                      try {
                        const res = await fetch(`/api/users/${u.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: !u.isActive })
                        }).then(r => r.json());
                        if (res.error) throw new Error(res.error);
                        addToast({ type: "success", title: "Succès", message: res.message });
                        refetch();
                      } catch (e: any) {
                        addToast({ type: "error", title: "Erreur", message: e.message || "Erreur" });
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95",
                      u.isActive ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700" : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"
                    )}
                    title={u.isActive ? "Désactiver" : "Activer"}
                  >
                    <Power className="w-3 h-3" />
                    {u.isActive ? "Actif" : "Inactif"}
                  </button>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <UserForm onClose={() => setShowForm(false)} roles={roles} />}
    </div>
  );
}
