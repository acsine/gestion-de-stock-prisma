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

export default function RolesPage() {
  const { data: rolesData, isLoading: rolesLoading } = useRoles();
  const { data: permsData } = usePermissionsList();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const seedPerms = useSeedPermissions();
  const { addToast } = useUIStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null); // null = creation, non-null = modification
  const [newRole, setNewRole] = useState({ name: "", description: "", permissionIds: [] as string[] });
  const [searchTerm, setSearchTerm] = useState("");

  const roles = rolesData?.data || [];
  const permissions = permsData?.data || [];

  const handleSeed = async () => {
    try {
      await seedPerms.mutateAsync();
      addToast({ type: "success", title: "Succès", message: "Permissions initialisées avec succès" });
    } catch (error: any) {
      addToast({ type: "error", title: "Erreur", message: error.message || "Impossible d'initialiser" });
    }
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setNewRole({ name: "", description: "", permissionIds: [] });
    setSearchTerm("");
    setShowAddModal(true);
  };

  const handleOpenEdit = (role: any) => {
    setEditingRole(role);
    setNewRole({
      name: role.name,
      description: role.description || "",
      permissionIds: role.permissions?.map((p: any) => p.id) || []
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
    if (!newRole.name.trim()) return addToast({ type: "error", title: "Erreur", message: "Le nom du rôle est requis" });
    if (newRole.permissionIds.length === 0) return addToast({ type: "error", title: "Erreur", message: "Veuillez sélectionner au moins une permission pour ce rôle" });
    
    try {
      if (editingRole) {
        await updateRole.mutateAsync({ id: editingRole.id, data: newRole });
        addToast({ type: "success", title: "Succès", message: "Rôle modifié avec succès" });
      } else {
        await createRole.mutateAsync(newRole);
        addToast({ type: "success", title: "Succès", message: "Rôle créé avec succès" });
      }
      setShowAddModal(false);
      setEditingRole(null);
      setNewRole({ name: "", description: "", permissionIds: [] });
    } catch (error: any) {
      addToast({ type: "error", title: "Erreur", message: error.message || "Erreur lors de l'enregistrement" });
    }
  };

  const handleDelete = async (role: any) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?`)) return;
    try {
      await deleteRole.mutateAsync(role.id);
      addToast({ type: "success", title: "Succès", message: "Rôle supprimé avec succès" });
    } catch (error: any) {
      addToast({ type: "error", title: "Erreur", message: error.message || "Impossible de supprimer ce rôle" });
    }
  };

  const isPending = editingRole ? updateRole.isPending : createRole.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rôles & Permissions</h1>
          <p className="text-gray-500 text-sm">Gérez les niveaux d'accès de vos employés</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSeed} 
            disabled={seedPerms.isPending}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-70 transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", seedPerms.isPending && "animate-spin")} /> 
            <span>{seedPerms.isPending ? "Initialisation..." : "Initialiser les permissions"}</span>
          </button>
          <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nouveau Rôle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rolesLoading ? (
          <div className="col-span-full py-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>
        ) : roles.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400">Aucun rôle défini</div>
        ) : roles.map((role: any) => (
          <div key={role.id} className="card overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-5 border-b bg-gray-50/50">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-lg text-gray-900">{role.name}</h3>
                <Shield className={`w-5 h-5 ${role.name === "ADMIN" ? "text-amber-500" : "text-blue-500"}`} />
              </div>
              <p className="text-sm text-gray-500 min-h-[40px]">{role.description || "Aucune description"}</p>
            </div>
            
            <div className="p-5 flex-1 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>Permissions</span>
                {role.name === "ADMIN" ? (
                  <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">TOUT</span>
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
                    <span>Accès total et illimité à toutes les fonctionnalités</span>
                  </div>
                ) : (!role.permissions || role.permissions.length === 0) ? (
                  <div className="w-full py-2.5 px-3 bg-red-50 border border-red-200/50 rounded-xl flex items-center gap-2 text-red-800 text-xs font-medium animate-in fade-in duration-300">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>Aucune permission. Rôle inactif et sans accès.</span>
                  </div>
                ) : (
                  <>
                    {role.permissions?.slice(0, 10).map((p: any) => (
                      <span key={p.id} className="px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-md text-[10px] font-medium">
                        {p.name}
                      </span>
                    ))}
                    {role.permissions?.length > 10 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-md text-[10px]">+{role.permissions.length - 10} de plus</span>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
              <span>{role._count?.users || 0} utilisateur(s)</span>
              {role.name !== "ADMIN" && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenEdit(role)}
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors px-2 py-1 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button 
                    onClick={() => handleDelete(role)}
                    disabled={deleteRole.isPending}
                    className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 disabled:opacity-50 transition-colors px-2 py-1 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
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
                  {editingRole ? `Modifier le rôle: ${editingRole.name}` : "Créer un nouveau rôle"}
                </h2>
                <p className="text-sm text-gray-500">
                  {editingRole ? "Modifiez le nom, la description et les permissions du rôle" : "Définissez le nom et les permissions associées"}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Nom du rôle *</label>
                  <input 
                    type="text" 
                    className="input w-full" 
                    placeholder="ex: Caissier, Responsable Stock..."
                    value={newRole.name}
                    onChange={e => setNewRole({...newRole, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                  <input 
                    type="text" 
                    className="input w-full" 
                    placeholder="Description courte..."
                    value={newRole.description}
                    onChange={e => setNewRole({...newRole, description: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-700">Sélectionner les permissions</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Filtrer..." 
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
                      <p className="text-sm text-gray-500">Aucune permission trouvée. <br/>Veuillez d'abord initialiser les permissions.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary py-3">Annuler</button>
              <button 
                onClick={handleCreate} 
                disabled={isPending}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
              >
                {isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : (editingRole ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                <span>{editingRole ? "Enregistrer les modifications" : "Créer le rôle"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
