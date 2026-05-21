"use client";
// src/app/(dashboard)/parametres/page.tsx
import { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, AlertCircle } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import { useSettings, useTenants } from "@/hooks/useQueries";
import { useSession } from "next-auth/react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useTranslation } from "@/locales/i18n";

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
  const { t, language } = useTranslation();
  const { data: session } = useSession();
  const { addToast } = useUIStore();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const { data: tenantsData } = useTenants();
  const tenants = tenantsData?.data || [];
  const tenantOptions = tenants.map((tn: any) => ({ value: tn.id, label: tn.name }));

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
        tenantId: selectedTenantId || (session?.user as any)?.tenantId || apiResponse?.debug?.tenantId 
      };

      const res = await fetch("/api/settings", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(dataToSave) 
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || (language === "fr" ? "Erreur lors de la sauvegarde" : "Error while saving"));

      addToast({ type: "success", title: t.settings.saveSuccess });
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
        addToast({ type: "success", title: language === "fr" ? "Logo uploadé !" : "Logo uploaded!" });
      }
    } catch (err) {
      addToast({ type: "error", title: language === "fr" ? "Erreur lors de l'upload" : "Error during upload" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-20 gap-3">
    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
    <p className="text-gray-500 animate-pulse">{language === "fr" ? "Chargement de la configuration..." : "Loading configuration..."}</p>
  </div>;

  if (error) return <div className="p-8 text-center text-red-500">
    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
    <p>{language === "fr" ? "Erreur lors du chargement des paramètres" : "Error loading settings"}</p>
  </div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" /> 
            {t.settings.title}
          </h1>
          <p className="text-gray-500 text-sm">{language === "fr" ? "Identité visuelle et configuration de base de votre entreprise" : "Visual identity and basic configuration of your company"}</p>
        </div>
        <div className="flex items-center gap-3">
          {( (session?.user as any)?.isSuperAdmin || apiResponse?.debug?.isSuper ) && (
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-2xl border border-orange-200 shadow-sm transition-all hover:border-orange-300">
              <div className="flex items-center gap-2 mr-1">
                <span className="text-[10px] font-black text-orange-700 uppercase tracking-tighter whitespace-nowrap">{language === "fr" ? "Gestion Multi-Tenant:" : "Multi-Tenant Management:"}</span>
                {isFetching && <RefreshCw className="w-3 h-3 animate-spin text-orange-500" />}
              </div>
              <SearchableSelect
                options={tenantOptions}
                value={selectedTenantId}
                onChange={setSelectedTenantId}
                placeholder={language === "fr" ? "Sélectionner..." : "Select..."}
                className="w-56"
                disabled={isFetching}
              />
            </div>
          )}
          <button 
            onClick={handleSave} 
            disabled={saving || ( ((session?.user as any)?.isSuperAdmin || apiResponse?.debug?.isSuper) && !selectedTenantId)} 
            className="btn-primary flex items-center justify-center gap-2 px-8 py-3 shadow-lg shadow-blue-200 min-w-[180px]"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? t.actions.saving : t.actions.save}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-6">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-3">{language === "fr" ? "Informations de l'entreprise" : "Company Information"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={language === "fr" ? "Nom commercial" : "Trade Name"} k="company_name" settings={localSettings} setSettings={setLocalSettings} placeholder="Ex: Sachand SARL" />
              <Field label={language === "fr" ? "Numéro de téléphone" : "Phone Number"} k="company_phone" settings={localSettings} setSettings={setLocalSettings} placeholder="+237 ..." />
              <Field label={language === "fr" ? "Email de contact" : "Contact Email"} k="company_email" settings={localSettings} setSettings={setLocalSettings} placeholder="contact@..." />
              <Field label={language === "fr" ? "Devise locale" : "Local Currency"} k="company_currency" settings={localSettings} setSettings={setLocalSettings} placeholder="XAF" />
            </div>
            <Field label={language === "fr" ? "Adresse physique" : "Physical Address"} k="company_address" settings={localSettings} setSettings={setLocalSettings} placeholder={language === "fr" ? "Ville, Quartier, Rue..." : "City, Area, Street..."} />
          </div>

          <div className="card p-6 space-y-6">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-3">{language === "fr" ? "Configuration & Taxes" : "Configuration & Taxes"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label={language === "fr" ? "Taux TVA (%)" : "VAT Rate (%)"} k="default_tax_rate" settings={localSettings} setSettings={setLocalSettings} type="number" placeholder="19.25" />
              <Field label={language === "fr" ? "Charges Sociales (%)" : "Social Charges (%)"} k="social_charges_rate" settings={localSettings} setSettings={setLocalSettings} type="number" placeholder="17.5" />
              <Field label={language === "fr" ? "Seuil Alerte Stock (%)" : "Stock Alert Threshold (%)"} k="low_stock_buffer" settings={localSettings} setSettings={setLocalSettings} type="number" placeholder="20" />
            </div>
          </div>

          <div className="card p-6 space-y-6">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-3">{language === "fr" ? "Numérotation & Séries" : "Numbering & Series"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={language === "fr" ? "Préfixe Factures" : "Invoice Prefix"} k="invoice_prefix" settings={localSettings} setSettings={setLocalSettings} placeholder="FAC" />
              <Field label={language === "fr" ? "Préfixe Bons de Commande" : "Purchase Order Prefix"} k="order_prefix" settings={localSettings} setSettings={setLocalSettings} placeholder="BC" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 text-center">{language === "fr" ? "Logo de l'entreprise" : "Company Logo"}</h2>
            <div className="border-4 border-dashed border-gray-100 rounded-3xl aspect-square flex flex-col items-center justify-center overflow-hidden bg-gray-50 relative group transition-all hover:border-blue-200">
              {localSettings.company_logo ? (
                <img src={localSettings.company_logo} alt="Logo" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="p-4 bg-white rounded-2xl shadow-sm">
                    <Save className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{language === "fr" ? "Cliquer pour choisir" : "Click to choose"}</span>
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
              {language === "fr"
                ? "Le logo sera affiché sur toutes vos factures et rapports officiels. Utilisez un fichier PNG transparent pour un meilleur rendu."
                : "The logo will be displayed on all your invoices and official reports. Use a transparent PNG file for best results."}
            </p>
          </div>

          <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">{language === "fr" ? "Aide" : "Help"}</p>
                <p className="text-xs text-blue-700 leading-relaxed mt-1">
                  {language === "fr"
                    ? "Les modifications apportées ici s'appliquent immédiatement à toute l'application pour tous les utilisateurs de votre entreprise."
                    : "Changes made here apply immediately across the entire application for all users in your company."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Section (Hidden in production or for non-admins) */}
      <div className="mt-12 pt-6 border-t border-gray-100 opacity-20 hover:opacity-100 transition-opacity">
        <details className="text-[10px] text-gray-400 font-mono">
          <summary className="cursor-pointer hover:text-gray-600">{language === "fr" ? "Informations de diagnostic" : "Diagnostic Information"}</summary>
          <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-1">
            <p>Tenant ID: {apiResponse?.debug?.tenantId || "N/A"}</p>
            <p>SuperAdmin: {apiResponse?.debug?.isSuper ? (language === "fr" ? "Oui" : "Yes") : (language === "fr" ? "Non" : "No")}</p>
            <p>{language === "fr" ? "Clés trouvées" : "Keys found"}: {apiResponse?.debug?.count || 0}</p>
            <p>{language === "fr" ? "État" : "Status"}: {isFetching ? (language === "fr" ? "Synchronisation..." : "Syncing...") : (language === "fr" ? "À jour" : "Up to date")}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
