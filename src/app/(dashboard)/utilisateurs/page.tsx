"use client";
// src/app/(dashboard)/utilisateurs/page.tsx
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useUIStore } from "@/stores/useUIStore";
import { cn, formatDate } from "@/lib/utils";
import { Users, Plus, RefreshCw, X, Settings2, ShieldCheck, Mail, Calendar, Power, Shield, Check } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema } from "@/lib/validations";
import { z } from "zod";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useRoles, useUsers, useCreateUser, useUpdateUser, useUpdateRole, usePermissionsList, useEmployees, useCashAccounts } from "@/hooks/useQueries";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/locales/i18n";

type UserInput = z.infer<typeof userSchema>;

function UserForm({ onClose, roles }: { onClose: () => void, roles: any[] }) {
  const { t, language } = useTranslation();
  const { addToast } = useUIStore();
  const { mutateAsync, isPending } = useCreateUser();
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({ status: "ACTIF" });
  const { data: accountsData } = useCashAccounts();
  const accounts = accountsData?.data || [];
  
  const activeEmployees = employeesData?.data || [];
  const unlinkedEmployees = activeEmployees.filter((emp: any) => !emp.userId);

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserInput) => {
    const res = await mutateAsync(data);
    if (res.error) {
      addToast({
        type: "error",
        title: t.common.error,
        message: typeof res.error === "string" ? res.error : t.common.error
      });
      return;
    }
    addToast({ type: "success", title: t.users.modal.saveSuccess });
    onClose();
  };

  const employeeOptions = unlinkedEmployees.map((emp: any) => ({
    value: emp.id,
    label: `${emp.firstName} ${emp.lastName}`,
    sub: `${emp.position}${emp.department ? ` - ${emp.department}` : ""}`
  }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-visible animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t.users.modal.addTitle}</h2>
            <p className="text-xs text-gray-500">
              {language === "fr" ? "Créez un compte pour un employé" : "Create an account for an employee"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">{language === "fr" ? "Employé *" : "Employee *"}</label>
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={employeeOptions}
                  value={field.value}
                  onChange={(val) => {
                    field.onChange(val);
                    const emp = unlinkedEmployees.find((e: any) => e.id === val);
                    if (emp) {
                      setValue("name", `${emp.firstName} ${emp.lastName}`);
                      if (emp.email) {
                        setValue("email", emp.email);
                      }
                    }
                  }}
                  disabled={isLoadingEmployees}
                  placeholder={
                    isLoadingEmployees 
                      ? (language === "fr" ? "Chargement des employés..." : "Loading employees...") 
                      : (language === "fr" ? "Sélectionner un employé..." : "Select an employee...")
                  }
                />
              )}
            />
            {errors.employeeId && <p className="text-red-500 text-xs mt-1">{errors.employeeId.message}</p>}
          </div>
          <div>
            <label className="label">{t.users.modal.name}</label>
            <input 
              {...register("name")} 
              readOnly 
              className="input w-full bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200" 
              placeholder={language === "fr" ? "Sélectionnez un employé pour remplir" : "Select an employee to fill"} 
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">{t.common.email} *</label>
            <input {...register("email")} type="email" className="input w-full" placeholder="jean.dupont@entreprise.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">{t.users.modal.password}</label>
            <input {...register("password")} type="password" className="input w-full" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">{t.users.modal.role}</label>
            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={roles.map(r => ({ value: r.id, label: r.name, sub: r.description }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={language === "fr" ? "Choisir un rôle..." : "Choose a role..."}
                />
              )}
            />
            {errors.roleId && <p className="text-red-500 text-xs mt-1">{errors.roleId.message}</p>}
          </div>
          <div>
            <label className="label">{language === "fr" ? "Caisse assignée (POS)" : "Assigned Cash Account (POS)"}</label>
            <Controller
              name="allowedCashAccountId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={[{ value: "", label: language === "fr" ? "Aucune caisse assignée" : "No assigned cash account", sub: "Libre" }, ...accounts.map((acc: any) => ({ value: acc.id, label: acc.name, sub: acc.type }))]}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={language === "fr" ? "Sélectionner une caisse..." : "Select a cash account..."}
                />
              )}
            />
            {errors.allowedCashAccountId && <p className="text-red-500 text-xs mt-1">{errors.allowedCashAccountId.message}</p>}
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3">
              {t.actions.cancel}
            </button>
            <button type="submit" disabled={isPending} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-500/20">
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {language === "fr" ? "Créer le compte" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserForm({ user, onClose, roles }: { user: any, onClose: () => void, roles: any[] }) {
  const { t, language } = useTranslation();
  const { addToast } = useUIStore();
  const { mutateAsync: updateUser, isPending: isUpdatingUser } = useUpdateUser();
  const { mutateAsync: updateRole, isPending: isUpdatingRole } = useUpdateRole();
  const { data: permsData } = usePermissionsList();
  const { data: accountsData } = useCashAccounts();

  const allPermissions = permsData?.data || [];
  const accounts = accountsData?.data || [];

  const [email, setEmail] = useState(user.email || "");
  const [roleId, setRoleId] = useState(user.roleId || "");
  const [password, setPassword] = useState("");
  const [allowedCashAccountId, setAllowedCashAccountId] = useState(user.allowedCashAccountId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRole = roles.find(r => r.id === roleId);
  const selectedRolePerms = selectedRole?.permissions || [];
  const selectedRolePermIds = selectedRolePerms.map((p: any) => p.id);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      addToast({
        type: "error",
        title: t.common.error,
        message: language === "fr" ? "Veuillez entrer un email valide" : "Please enter a valid email"
      });
      return;
    }

    if (password && password.length < 8) {
      addToast({
        type: "error",
        title: t.common.error,
        message: language === "fr" ? "Le mot de passe doit faire au moins 8 caractères." : "Password must be at least 8 characters long."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateUser({
        id: user.id,
        data: {
          email,
          roleId: roleId || null,
          password: password || undefined,
          allowedCashAccountId: allowedCashAccountId || null
        }
      });

      if (res.error) {
        addToast({
          type: "error",
          title: t.common.error,
          message: res.error
        });
        setIsSubmitting(false);
        return;
      }

      addToast({
        type: "success",
        title: t.common.success,
        message: language === "fr" ? "Utilisateur mis à jour avec succès" : "User updated successfully"
      });
      onClose();
    } catch (err: any) {
      addToast({
        type: "error",
        title: t.common.error,
        message: err.message || t.common.error
      });
      setIsSubmitting(false);
    }
  };

  const handleTogglePermission = async (permId: string) => {
    if (!selectedRole) return;
    if (selectedRole.name === "ADMIN") {
      addToast({
        type: "error",
        title: language === "fr" ? "Action interdite" : "Action forbidden",
        message: language === "fr" 
          ? "Le rôle ADMIN possède toutes les permissions par défaut et ne peut pas être modifié" 
          : "The ADMIN role has all permissions by default and cannot be modified"
      });
      return;
    }

    const currentPermIds = selectedRolePermIds;
    const newPermIds = currentPermIds.includes(permId)
      ? currentPermIds.filter((id: string) => id !== permId)
      : [...currentPermIds, permId];

    try {
      await updateRole({
        id: selectedRole.id,
        data: {
          name: selectedRole.name,
          description: selectedRole.description || "",
          permissionIds: newPermIds,
          is_head_departement: selectedRole.is_head_departement,
          is_manager_sector: selectedRole.is_manager_sector,
          is_saler_role: selectedRole.is_saler_role,
          is_unique: selectedRole.is_unique
        }
      });
      addToast({
        type: "success",
        title: t.common.success,
        message: language === "fr" ? "Permissions du rôle mises à jour avec succès" : "Role permissions updated successfully"
      });
    } catch (error: any) {
      addToast({
        type: "error",
        title: t.common.error,
        message: error.message || t.common.error
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-visible animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {language === "fr" ? "Modifier l'utilisateur" : "Edit User"}
            </h2>
            <p className="text-xs text-gray-500">
              {language === "fr" 
                ? `Compte de l'employé : ${user.name}` 
                : `Account of employee: ${user.name}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t.users.modal.name}</label>
              <input 
                value={user.name} 
                readOnly 
                className="input w-full bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200" 
              />
            </div>
            <div>
              <label className="label">{t.common.email} *</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="input w-full" 
                placeholder="email@entreprise.com" 
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                {language === "fr" ? "Changer le mot de passe" : "Change Password"}
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="input w-full" 
                placeholder={language === "fr" ? "Laisser vide si inchangé" : "Leave blank if unchanged"} 
              />
            </div>
            <div>
              <label className="label">{t.users.modal.role}</label>
              <SearchableSelect
                options={roles.map(r => ({ value: r.id, label: r.name, sub: r.description }))}
                value={roleId}
                onChange={(val) => setRoleId(val)}
                placeholder={language === "fr" ? "Choisir un rôle..." : "Choose a role..."}
              />
            </div>
          </div>

          <div>
            <label className="label">{language === "fr" ? "Caisse assignée (POS)" : "Assigned Cash Account (POS)"}</label>
            <SearchableSelect
              options={[{ value: "", label: language === "fr" ? "Aucune caisse assignée" : "No assigned cash account", sub: "Libre" }, ...accounts.map((acc: any) => ({ value: acc.id, label: acc.name, sub: acc.type }))]}
              value={allowedCashAccountId || ""}
              onChange={(val) => setAllowedCashAccountId(val)}
              placeholder={language === "fr" ? "Sélectionner une caisse..." : "Select a cash account..."}
            />
          </div>

          {/* PERMISSIONS BLOCK */}
          <div className="border-t pt-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {language === "fr" 
                  ? `Permissions associées au rôle : ${selectedRole?.name || ''}` 
                  : `Permissions for role: ${selectedRole?.name || ''}`}
              </h3>
              <p className="text-[11px] text-gray-500 leading-tight">
                {language === "fr" 
                  ? "Cliquez sur une permission pour l'ajouter ou la retirer de ce rôle. Les modifications affecteront tous les utilisateurs ayant ce rôle." 
                  : "Click on a permission to add or remove it from this role. Changes will affect all users sharing this role."}
              </p>
            </div>

            {selectedRole?.name === "ADMIN" ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" />
                <span>
                  {language === "fr" 
                    ? "Le rôle ADMINISTRATEUR possède toutes les permissions par défaut et ne peut pas être modifié." 
                    : "The ADMINISTRATOR role has all permissions by default and cannot be modified."}
                </span>
              </div>
            ) : allPermissions.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span>{language === "fr" ? "Chargement des permissions..." : "Loading permissions..."}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                {allPermissions.map((perm: any) => {
                  const hasPerm = selectedRolePermIds.includes(perm.id);
                  return (
                    <button
                      key={perm.id}
                      type="button"
                      onClick={() => handleTogglePermission(perm.id)}
                      disabled={isUpdatingRole}
                      className={cn(
                        "p-2 rounded-xl border text-left text-xs font-medium flex items-start gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]",
                        hasPerm 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                          : "bg-white border-gray-200 hover:border-gray-300 text-gray-600"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border",
                        hasPerm 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "border-gray-300"
                      )}>
                        {hasPerm && <Check className="w-3 h-3 font-bold" />}
                      </div>
                      <div className="leading-tight overflow-hidden">
                        <div className="font-bold truncate">{perm.name}</div>
                        <div className="text-[9px] opacity-75 font-mono truncate mt-0.5">{perm.code}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3">
              {t.actions.cancel}
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || isUpdatingUser} 
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-500/20"
            >
              {(isSubmitting || isUpdatingUser) ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {language === "fr" ? "Enregistrer les modifications" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UtilisateursPage() {

  const { t, language } = useTranslation();
  const { data: session } = useSession();
  const { addToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isNavigatingRoles, setIsNavigatingRoles] = useState(false);
  const router = useRouter();
  const { data, isLoading, refetch } = useUsers();
  const { data: rolesData } = useRoles();
  const roles = rolesData?.data || [];
  const users = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.users.title}</h1>
          <p className="text-gray-500 text-sm">
            {language === "fr" 
              ? "Contrôlez les accès et la sécurité de la plateforme" 
              : "Manage access controls and platform security"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setIsNavigatingRoles(true);
              router.push("/utilisateurs/roles");
            }}
            disabled={isNavigatingRoles}
            className="btn-secondary flex items-center gap-2 text-sm px-4 disabled:opacity-70 transition-all"
          >
            {isNavigatingRoles ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Settings2 className="w-4 h-4" />
            )}
            <span>{t.users.roles.title}</span>
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm px-4 font-bold shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" /> {t.users.addBtn}
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t.users.table.name}</th>
              <th>{language === "fr" ? "Contact" : "Contact"}</th>
              <th>{t.users.table.role}</th>
              <th>{language === "fr" ? "Caisse (POS)" : "Cash Account (POS)"}</th>
              <th>{language === "fr" ? "Dernière activité" : "Last login"}</th>
              <th>{t.users.table.status}</th>
              <th className="text-right">{t.actions.actions}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  {language === "fr" ? "Aucun compte utilisateur trouvé" : "No user accounts found"}
                </td>
              </tr>
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
                    {u.role?.name || (language === "fr" ? "Sans rôle" : "No role")}
                  </div>
                </td>
                <td>
                  {u.allowedCashAccount ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {u.allowedCashAccount.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-mono">—</span>
                  )}
                </td>
                <td>
                  <div className="text-xs text-gray-500 flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {u.lastLogin ? formatDate(u.lastLogin) : (language === "fr" ? "Jamais connecté" : "Never logged in")}
                    </div>
                  </div>
                </td>
                <td>
                  <button 
                    onClick={async () => {
                      if (u.id === (session?.user as any)?.id) {
                        addToast({
                          type: "error",
                          title: language === "fr" ? "Action interdite" : "Forbidden action",
                          message: language === "fr" ? "Vous ne pouvez pas vous désactiver vous-même" : "You cannot deactivate yourself"
                        });
                        return;
                      }
                      if (!confirm(language === "fr" ? `Voulez-vous ${u.isActive ? 'désactiver' : 'activer'} cet utilisateur ?` : `Do you want to ${u.isActive ? 'deactivate' : 'activate'} this user?`)) return;
                      try {
                        const res = await fetch(`/api/users/${u.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: !u.isActive })
                        }).then(r => r.json());
                        if (res.error) throw new Error(res.error);
                        addToast({ type: "success", title: t.common.success, message: res.message });
                        refetch();
                      } catch (e: any) {
                        addToast({ type: "error", title: t.common.error, message: e.message || t.common.error });
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95",
                      u.isActive ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700" : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"
                    )}
                    title={u.isActive ? (language === "fr" ? "Désactiver" : "Deactivate") : (language === "fr" ? "Activer" : "Activate")}
                  >
                    <Power className="w-3 h-3" />
                    {u.isActive ? t.common.active : t.common.inactive}
                  </button>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                      title={t.settings.title}
                    >
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
      {editingUser && (
        <EditUserForm 
          user={editingUser} 
          roles={roles}
          onClose={() => {
            setEditingUser(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
