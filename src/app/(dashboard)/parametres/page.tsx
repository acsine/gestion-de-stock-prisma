"use client";
// src/app/(dashboard)/parametres/page.tsx
import { useState, useEffect } from "react";
import { Settings, Save, RefreshCw } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";

const Field = ({ label, k, settings, setSettings, type = "text", placeholder = "" }: { label: string; k: string; settings: any; setSettings: any; type?: string; placeholder?: string }) => (
  <div>
    <label className="label">{label}</label>
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
  const { addToast } = useUIStore();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      setSettings(d.data || {});
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      addToast({ type: "success", title: "Paramètres sauvegardés" });
    } catch {
      addToast({ type: "error", title: "Erreur de sauvegarde" });
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
        setSettings(s => ({ ...s, company_logo: data.url }));
        addToast({ type: "success", title: "Logo uploadé !" });
      }
    } catch (err) {
      addToast({ type: "error", title: "Erreur lors de l'upload" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-500 text-sm">Configuration de votre application</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Settings className="w-5 h-5 text-blue-600" />Informations entreprise</h2>
        <div className="flex gap-6 items-start">
          <div className="flex-1 space-y-4">
            <Field label="Nom de l'entreprise" k="company_name" settings={settings} setSettings={setSettings} placeholder="Sachand SARL" />
            <Field label="Adresse" k="company_address" settings={settings} setSettings={setSettings} placeholder="Yaoundé, Cameroun" />
            <Field label="Téléphone" k="company_phone" settings={settings} setSettings={setSettings} placeholder="+237 600 000 000" />
            <Field label="Email" k="company_email" settings={settings} setSettings={setSettings} placeholder="contact@entreprise.cm" />
          </div>
          <div className="w-48 space-y-2">
            <label className="label text-center">Logo de l'entreprise</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl aspect-square flex flex-col items-center justify-center overflow-hidden bg-gray-50 relative group">
              {settings.company_logo ? (
                <img src={settings.company_logo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-gray-400 text-xs text-center p-4">Cliquer pour uploader</div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
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
            <p className="text-[10px] text-gray-400 text-center italic">Format suggéré: PNG ou JPG</p>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Paramètres financiers</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Devise" k="company_currency" settings={settings} setSettings={setSettings} placeholder="XAF" />
          <Field label="Taux TVA par défaut (%)" k="default_tax_rate" settings={settings} setSettings={setSettings} type="number" placeholder="19.25" />
          <Field label="Taux charges sociales (%)" k="social_charges_rate" settings={settings} setSettings={setSettings} type="number" placeholder="17.5" />
          <Field label="Tampon alerte stock (%)" k="low_stock_buffer" settings={settings} setSettings={setSettings} type="number" placeholder="20" />
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Numérotation des documents</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Préfixe factures" k="invoice_prefix" settings={settings} setSettings={setSettings} placeholder="FAC" />
          <Field label="Préfixe bons de commande" k="order_prefix" settings={settings} setSettings={setSettings} placeholder="BC" />
        </div>
      </div>
    </div>
  );
}
