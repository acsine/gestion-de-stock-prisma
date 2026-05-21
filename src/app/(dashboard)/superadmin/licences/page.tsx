// src/app/(dashboard)/superadmin/licences/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getLicenses, updateLicenseDetails } from "@/app/actions/admin-actions";
import { ShieldAlert, Save, Users, Clock, Download, CheckCircle2 } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { useTranslation } from "@/locales/i18n";

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toasts, show, close } = useToast();
  const { t, language } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getLicenses();
    setLicenses(data);
    setLoading(false);
  };

  const handleSave = async (id: string, data: any) => {
    try {
      await updateLicenseDetails(id, data);
      setIsModalOpen(true);
      loadData();
    } catch (err: any) {
      show(err.message || (language === "fr" ? "Erreur lors de la mise à jour" : "Error during update"), "error");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onClose={close} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-blue-600" />
          {language === "fr" ? "Tarifs & Limites des Licences" : "License Pricing & Limits"}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {licenses.map((license) => (
          <LicenseCard key={license.id} license={license} onSave={handleSave} />
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in slide-in-from-bottom-4 duration-300 border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce">
                <CheckCircle2 className="w-10 h-10 animate-in spin-in-12 duration-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
                {language === "fr" ? "Licence mise à jour !" : "License updated!"}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                {language === "fr"
                  ? "Les tarifs et les limites d'accès de cette formule ont été modifiés et propagés avec succès."
                  : "The pricing and access limits for this plan have been successfully updated and propagated."}
              </p>
            </div>
            <div className="px-8 pb-8 flex justify-center">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm"
              >
                {language === "fr" ? "Compris" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LicenseCard({ license, onSave }: { license: any; onSave: any }) {
  const [data, setData] = useState({ ...license });
  const [saving, setSaving] = useState(false);
  const { t, language } = useTranslation();

  const handleSave = async () => {
    setSaving(true);
    await onSave(license.id, data);
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="font-black text-lg text-slate-800 uppercase tracking-tighter">{data.name}</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="p-6 space-y-4 flex-1">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
            {language === "fr" ? "Prix (XAF)" : "Price (XAF)"}
          </label>
          <input
            type="number"
            value={data.price}
            onChange={(e) => setData({ ...data, price: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              {language === "fr" ? "Durée (Jours)" : "Duration (Days)"}
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                value={data.durationDays}
                onChange={(e) => setData({ ...data, durationDays: e.target.value })}
                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              {language === "fr" ? "Max Utilisateurs" : "Max Users"}
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                value={data.maxUsers}
                onChange={(e) => setData({ ...data, maxUsers: e.target.value })}
                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-slate-700">
              {language === "fr" ? "Autoriser Téléchargement" : "Allow Download"}
            </span>
          </div>
          <input
            type="checkbox"
            checked={data.canDownload}
            onChange={(e) => setData({ ...data, canDownload: e.target.checked })}
            className="w-5 h-5 accent-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
