"use client";
// src/app/(dashboard)/utilisateurs/roles/page.tsx
import { useState } from "react";
import { 
  useRoles, 
  usePermissionsList, 
  useCreateRole, 
  useUpdateRole, 
  useDeleteRole, 
  useSeedPermissions 
} from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { Shield, Plus, RefreshCw, X, Check, Search, Lock, AlertCircle, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/locales/i18n";

export default function RolesPage() {
  const { t, language } = useTranslation();
  const { data: rolesData, isLoading: rolesLoading } = useRoles();
  const { data: permsData } = usePermissionsList();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const seedPerms = useSeedPermissions();
  const { addToast } = useUIStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null); // null = creation, non-null = modification
  const [newRole, setNewRole] = useState({ 
    name: "", 
    description: "", 
    permissionIds: [] as string[],
    is_head_departement: false,
    is_manager_sector: false,
    is_saler_role: false,
    is_unique: false
  });
  const [searchTerm, setSearchTerm] = useState("");

  const roles = rolesData?.data || [];
  const permissions = permsData?.data || [];

  const handleSeed = async () => {
    try {
      await seedPerms.mutateAsync();
      addToast({ type: "success", title: t.common.success, message: language === "fr" ? "Permissions initialisées avec succès" : "Permissions initialized successfully" });
    } catch (error: any) {
      addToast({ type: "error", title: t.common.error, message: error.message || (language === "fr" ? "Impossible d'initialiser" : "Unable to initialize") });
    }
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setNewRole({ 
      name: "", 
      description: "", 
      permissionIds: [],
      is_head_departement: false,
      is_manager_sector: false,
      is_saler_role: false,
      is_unique: false
    });
    setSearchTerm("");
    setShowAddModal(true);
  };

  const handleOpenEdit = (role: any) => {
    setEditingRole(role);
    setNewRole({
      name: role.name,
      description: role.description || "",
      permissionIds: role.permissions?.map((p: any) => p.id) || [],
      is_head_departement: role.is_head_departement || false,
      is_manager_sector: role.is_manager_sector || false,
      is_saler_role: role.is_saler_role || false,
      is_unique: role.is_unique || false
    });
    setSearchTerm("");
    setShowAddModal(true);
  };

  const handleTogglePerm = (id: string) => {
    setNewRole(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id) 
        ? prev.permissionIds.filter(pid => pid !== id)
        : [...prev.permissionIds, id]
    }));
  };

  const handleCreate = async () => {
    if (!newRole.name.trim()) return addToast({ type: "error", title: t.common.error, message: language === "fr" ? "Le nom du rôle est requis" : "Role name is required" });
    if (newRole.permissionIds.length === 0) return addToast({ type: "error", title: t.common.error, message: language === "fr" ? "Veuillez sélectionner au moins une permission pour ce rôle" : "Please select at least one permission for this role" });
    
    try {
      if (editingRole) {
        await updateRole.mutateAsync({ id: editingRole.id, data: newRole });
        addToast({ type: "success", title: t.common.success, message: language === "fr" ? "Rôle modifié avec succès" : "Role updated successfully" });
      } else {
        await createRole.mutateAsync(newRole);
        addToast({ type: "success", title: t.common.success, message: language === "fr" ? "Rôle créé avec succès" : "Role created successfully" });
      }
      setShowAddModal(false);
      setEditingRole(null);
      setNewRole({
        name: "",
        description: "",
        permissionIds: [],
        is_head_departement: false,
        is_manager_sector: false,
        is_saler_role: false,
        is_unique: false
      });
    } catch (error: any) {
      addToast({ type: "error", title: t.common.error, message: error.message || (language === "fr" ? "Erreur lors de l'enregistrement" : "Error while saving") });
    }
  };

  const handleDelete = async (role: any) => {
    if (!window.confirm(language === "fr" ? `Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?` : `Are you sure you want to delete the role "${role.name}"?`)) return;
    try {
      await deleteRole.mutateAsync(role.id);
      addToast({ type: "success", title: t.common.success, message: language === "fr" ? "Rôle supprimé avec succès" : "Role deleted successfully" });
    } catch (error: any) {
      addToast({ type: "error", title: t.common.error, message: error.message || (language === "fr" ? "Impossible de supprimer ce rôle" : "Unable to delete this role") });
    }
  };

  const isPending = editingRole ? updateRole.isPending : createRole.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.users.roles.title}</h1>
          <p className="text-gray-500 text-sm">{language === "fr" ? "Gérez les niveaux d'accès de vos employés" : "Manage your employees' access levels"}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSeed} 
            disabled={seedPerms.isPending}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-70 transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", seedPerms.isPending && "animate-spin")} /> 
            <span>{seedPerms.isPending ? (language === "fr" ? "Initialisation..." : "Initializing...") : (language === "fr" ? "Initialiser les permissions" : "Initialize permissions")}</span>
          </button>
          <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> {language === "fr" ? "Nouveau Rôle" : "New Role"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rolesLoading ? (
          <div className="col-span-full py-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>
        ) : roles.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400">{language === "fr" ? "Aucun rôle défini" : "No roles defined"}</div>
        ) : roles.map((role: any) => (
          <div key={role.id} className="card overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-5 border-b bg-gray-50/50">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-lg text-gray-900">{role.name}</h3>
                <Shield className={`w-5 h-5 ${role.name === "ADMIN" ? "text-amber-500" : "text-blue-500"}`} />
              </div>
              <p className="text-sm text-gray-500 min-h-[40px]">{role.description || (language === "fr" ? "Aucune description" : "No description")}</p>
              
              {/* Special Role Badges */}
              {(role.is_head_departement || role.is_manager_sector || role.is_saler_role || role.is_unique) && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-gray-100">
                  {role.is_head_departement && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {language === "fr" ? "Chef Dép." : "Dept. Head"}
                    </span>
                  )}
                  {role.is_manager_sector && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {language === "fr" ? "Resp. Secteur" : "Sector Mgr"}
                    </span>
                  )}
                  {role.is_saler_role && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {language === "fr" ? "Vendeur" : "Sales"}
                    </span>
                  )}
                  {role.is_unique && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                      {language === "fr" ? "Unique" : "Unique"}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-5 flex-1 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>{language === "fr" ? "Permissions" : "Permissions"}</span>
                {role.name === "ADMIN" ? (
                  <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">{language === "fr" ? "TOUT" : "ALL"}</span>
                ) : (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black",
                    (role.permissions?.length || 0) === 0 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {role.permissions?.length || 0}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                {role.name === "ADMIN" ? (
                  <div className="w-full py-2.5 px-3 bg-amber-50 border border-amber-200/50 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-medium animate-in fade-in duration-300">
                    <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
                    <span>{language === "fr" ? "Accès total et illimité à toutes les fonctionnalités" : "Full and unlimited access to all features"}</span>
                  </div>
                ) : (!role.permissions || role.permissions.length === 0) ? (
                  <div className="w-full py-2.5 px-3 bg-red-50 border border-red-200/50 rounded-xl flex items-center gap-2 text-red-800 text-xs font-medium animate-in fade-in duration-300">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>{language === "fr" ? "Aucune permission. Rôle inactif et sans accès." : "No permissions. Inactive role with no access."}</span>
                  </div>
                ) : (
                  <>
                    {role.permissions?.slice(0, 10).map((p: any) => (
                      <span key={p.id} className="px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-md text-[10px] font-medium">
                        {p.name}
                      </span>
                    ))}
                    {role.permissions?.length > 10 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-md text-[10px]">+{role.permissions.length - 10} {language === "fr" ? "de plus" : "more"}</span>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
              <span>{role._count?.users || 0} {language === "fr" ? "utilisateur(s)" : "user(s)"}</span>
              {role.name !== "ADMIN" && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenEdit(role)}
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors px-2 py-1 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> {t.actions.edit}
                  </button>
                  <button 
                    onClick={() => handleDelete(role)}
                    disabled={deleteRole.isPending}
                    className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 disabled:opacity-50 transition-colors px-2 py-1 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t.actions.delete}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Unified Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingRole 
                    ? (language === "fr" ? `Modifier le rôle: ${editingRole.name}` : `Edit role: ${editingRole.name}`) 
                    : (language === "fr" ? "Créer un nouveau rôle" : "Create a new role")}
                </h2>
                <p className="text-sm text-gray-500">
                  {editingRole 
                    ? (language === "fr" ? "Modifiez le nom, la description et les permissions du rôle" : "Edit the role's name, description, and permissions") 
                    : (language === "fr" ? "Définissez le nom et les permissions associées" : "Define the name and associated permissions")}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">{t.users.roles.modal.name}</label>
                  <input 
                    type="text" 
                    className="input w-full" 
                    placeholder={language === "fr" ? "ex: Caissier, Responsable Stock..." : "e.g., Cashier, Stock Manager..."}
                    value={newRole.name}
                    onChange={e => setNewRole({...newRole, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">{t.common.description}</label>
                  <input 
                    type="text" 
                    className="input w-full" 
                    placeholder={language === "fr" ? "Description courte..." : "Short description..."}
                    value={newRole.description}
                    onChange={e => setNewRole({...newRole, description: e.target.value})}
                  />
                </div>
              </div>

              {/* Special Role Configuration Flags */}
              <div className="border border-gray-150 rounded-xl p-4 bg-gray-50/50 space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{language === "fr" ? "Configuration Spéciale" : "Special Configuration"}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border bg-white cursor-pointer hover:shadow-sm transition-all
                    ${newRole.is_head_departement ? "border-purple-200 bg-purple-50/10" : "border-gray-100"}`}>
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={newRole.is_head_departement}
                      onChange={e => setNewRole({...newRole, is_head_departement: e.target.checked})}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{language === "fr" ? "Chef de département" : "Head of department"}</p>
                      <p className="text-[10px] text-gray-400">{language === "fr" ? "Ce rôle désigne un responsable de département" : "This role represents a department head"}</p>
                    </div>
                  </label>
                  
                  <label className={`flex items-start gap-3 p-3 rounded-lg border bg-white cursor-pointer hover:shadow-sm transition-all
                    ${newRole.is_manager_sector ? "border-indigo-200 bg-indigo-50/10" : "border-gray-100"}`}>
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={newRole.is_manager_sector}
                      onChange={e => setNewRole({...newRole, is_manager_sector: e.target.checked})}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{language === "fr" ? "Responsable de secteur" : "Sector manager"}</p>
                      <p className="text-[10px] text-gray-400">{language === "fr" ? "Ce rôle désigne un manager de secteur" : "This role represents a sector manager"}</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border bg-white cursor-pointer hover:shadow-sm transition-all
                    ${newRole.is_saler_role ? "border-emerald-200 bg-emerald-50/10" : "border-gray-100"}`}>
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={newRole.is_saler_role}
                      onChange={e => setNewRole({...newRole, is_saler_role: e.target.checked})}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{language === "fr" ? "Rôle Vendeur" : "Sales role"}</p>
                      <p className="text-[10px] text-gray-400">{language === "fr" ? "Ce rôle est destiné aux vendeurs" : "This role is for sales staff"}</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border bg-white cursor-pointer hover:shadow-sm transition-all
                    ${newRole.is_unique ? "border-pink-200 bg-pink-50/10" : "border-gray-100"}`}>
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      checked={newRole.is_unique}
                      onChange={e => setNewRole({...newRole, is_unique: e.target.checked})}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{language === "fr" ? "Rôle Unique" : "Unique role"}</p>
                      <p className="text-[10px] text-gray-400">{language === "fr" ? "Un seul utilisateur peut avoir ce rôle" : "Only one user can have this role"}</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-700">{language === "fr" ? "Sélectionner les permissions" : "Select permissions"}</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder={language === "fr" ? "Filtrer..." : "Filter..."} 
                      className="text-xs border rounded-lg pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 border rounded-xl p-3 bg-gray-50 max-h-[300px] overflow-y-auto">
                  {permissions
                    .filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((p: any) => (
                    <label 
                      key={p.id} 
                      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer hover:shadow-sm
                        ${newRole.permissionIds.includes(p.id) ? "bg-blue-50 border-blue-200" : "bg-white border-gray-100"}`}
                    >
                      <input 
                        type="checkbox" 
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={newRole.permissionIds.includes(p.id)}
                        onChange={() => handleTogglePerm(p.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{p.code}</p>
                      </div>
                    </label>
                  ))}
                  {permissions.length === 0 && (
                    <div className="col-span-full py-10 text-center">
                      <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                      <p className="text-sm text-gray-500">{language === "fr" ? <>Aucune permission trouvée. <br/>Veuillez d'abord initialiser les permissions.</> : <>No permissions found. <br/>Please initialize permissions first.</>}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary py-3">{t.actions.cancel}</button>
              <button 
                onClick={handleCreate} 
                disabled={isPending}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
              >
                {isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : (editingRole ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                <span>{editingRole ? (language === "fr" ? "Enregistrer les modifications" : "Save changes") : (language === "fr" ? "Créer le rôle" : "Create role")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
