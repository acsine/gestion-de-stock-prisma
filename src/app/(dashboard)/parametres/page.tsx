"use client";
// src/app/(dashboard)/parametres/page.tsx
import { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, AlertCircle } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import { useSettings, useTenants } from "@/hooks/useQueries";
import { useSession } from "next-auth/react";

const Field = ({ label, k, settings, setSettings, type = "text", placeholder = "" }: { label: string; k: string; settings: any; setSettings: any; type?: string; placeholder?: string }) => (
  <div>
    <label className="label text-xs font-bold text-gray-500 uppercase mb-1.5 block">{label}</label>
    <input 
      type={type} 
      value={settings[k] || ""} 
      onChange={(e) => setSettings((s: any) => ({ ...s, [k]: e.target.value }))} 
      className="input" 
      placeholder={placeholder} 
    />
  </div>
);

export default function ParametresPage() {
  const { data: session } = useSession();
  const { addToast } = useUIStore();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const { data: tenantsData } = useTenants();
  const tenants = tenantsData?.data || [];

  // Use React Query for more reliable fetching
  const { data: apiResponse, isLoading, error, refetch, isFetching } = useSettings(selectedTenantId);

  useEffect(() => {
    if (apiResponse?.data) {
      console.log("[SETTINGS] Data received:", apiResponse.data);
      setLocalSettings(apiResponse.data);
    }
  }, [apiResponse]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = { 
        ...localSettings, 
        tenantId: selectedTenantId || (session.user as any).tenantId || apiResponse?.debug?.tenantId 
      };

      const res = await fetch("/api/settings", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(dataToSave) 
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur lors de la sauvegarde");

      addToast({ type: "success", title: "Paramètres sauvegardés avec succès" });
      refetch(); // Reload from API
    } catch (err: any) {
      addToast({ type: "error", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setLocalSettings(s => ({ ...s, company_logo: data.url }));
        addToast({ type: "success", title: "Logo uploadé !" });
      }
    } catch (err) {
      addToast({ type: "error", title: "Erreur lors de l'upload" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-20 gap-3">
    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
    <p className="text-gray-500 animate-pulse">Chargement de la configuration...</p>
  </div>;

  if (error) return <div className="p-8 text-center text-red-500">
    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
    <p>Erreur lors du chargement des paramètres</p>
  </div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" /> 
            Paramètres Généraux
          </h1>
          <p className="text-gray-500 text-sm">Identité visuelle et configuration de base de votre entreprise</p>
        </div>
        <div className="flex items-center gap-3">
          {( (session?.user as any)?.isSuperAdmin || apiResponse?.debug?.isSuper ) && (
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-2xl border-2 border-orange-200 shadow-sm transition-all hover:border-orange-300">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-orange-700 uppercase tracking-tighter whitespace-nowrap">Gestion Multi-Tenant:</span>
                {isFetching && <RefreshCw className="w-3 h-3 animate-spin text-orange-500" />}
              </div>
              <select 
                value={selectedTenantId} 
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-orange-900 focus:ring-0 cursor-pointer min-w-[200px] py-1"
                disabled={isFetching}
              >
                <option value="">-- Sélectionner une entreprise --</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <button 
            onClick={handleSave} 
            disabled={saving || ( ((session?.user as any)?.isSuperAdmin || apiResponse?.debug?.isSuper) && !selectedTenantId)} 
            className="btn-primary flex items-center justify-center gap-2 px-8 py-3 shadow-lg shadow-blue-200 min-w-[180px]"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-6">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-3">Informations de l'entreprise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nom commercial" k="company_name" settings={localSettings} setSettings={setLocalSettings} placeholder="Ex: Sachand SARL" />
              <Field label="Numéro de téléphone" k="company_phone" settings={localSettings} setSettings={setLocalSettings} placeholder="+237 ..." />
              <Field label="Email de contact" k="company_email" settings={localSettings} setSettings={setLocalSettings} placeholder="contact@..." />
              <Field label="Devise locale" k="company_currency" settings={localSettings} setSettings={setLocalSettings} placeholder="XAF" />
            </div>
            <Field label="Adresse physique" k="company_address" settings={localSettings} setSettings={setLocalSettings} placeholder="Ville, Quartier, Rue..." />
          </div>

          <div className="card p-6 space-y-6">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-3">Configuration & Taxes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Taux TVA (%)" k="default_tax_rate" settings={localSettings} setSettings={setLocalSettings} type="number" placeholder="19.25" />
              <Field label="Charges Sociales (%)" k="social_charges_rate" settings={localSettings} setSettings={setLocalSettings} type="number" placeholder="17.5" />
              <Field label="Seuil Alerte Stock (%)" k="low_stock_buffer" settings={localSettings} setSettings={setLocalSettings} type="number" placeholder="20" />
            </div>
          </div>

          <div className="card p-6 space-y-6">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-3">Numérotation & Séries</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Préfixe Factures" k="invoice_prefix" settings={localSettings} setSettings={setLocalSettings} placeholder="FAC" />
              <Field label="Préfixe Bons de Commande" k="order_prefix" settings={localSettings} setSettings={setLocalSettings} placeholder="BC" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 text-center">Logo de l'entreprise</h2>
            <div className="border-4 border-dashed border-gray-100 rounded-3xl aspect-square flex flex-col items-center justify-center overflow-hidden bg-gray-50 relative group transition-all hover:border-blue-200">
              {localSettings.company_logo ? (
                <img src={localSettings.company_logo} alt="Logo" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="p-4 bg-white rounded-2xl shadow-sm">
                    <Save className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Cliquer pour choisir</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors" />

              {uploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                disabled={uploading}
              />
            </div>
            <p className="mt-4 text-[10px] text-gray-400 text-center italic leading-relaxed">
              Le logo sera affiché sur toutes vos factures et rapports officiels. 
              Utilisez un fichier PNG transparent pour un meilleur rendu.
            </p>
          </div>

          <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Aide</p>
                <p className="text-xs text-blue-700 leading-relaxed mt-1">
                  Les modifications apportées ici s'appliquent immédiatement à toute l'application pour tous les utilisateurs de votre entreprise.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Section (Hidden in production or for non-admins) */}
      <div className="mt-12 pt-6 border-t border-gray-100 opacity-20 hover:opacity-100 transition-opacity">
        <details className="text-[10px] text-gray-400 font-mono">
          <summary className="cursor-pointer hover:text-gray-600">Informations de diagnostic</summary>
          <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-1">
            <p>Tenant ID: {apiResponse?.debug?.tenantId || "N/A"}</p>
            <p>SuperAdmin: {apiResponse?.debug?.isSuper ? "Oui" : "Non"}</p>
            <p>Clés trouvées: {apiResponse?.debug?.count || 0}</p>
            <p>État: {isFetching ? "Synchronisation..." : "À jour"}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
