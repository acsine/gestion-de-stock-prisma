// src/app/(dashboard)/superadmin/licences/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getLicenses, updateLicenseDetails } from "@/app/actions/admin-actions";
import { ShieldAlert, Save, Users, Clock, Download } from "lucide-react";

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getLicenses();
    setLicenses(data);
    setLoading(false);
  };

  const handleSave = async (id: string, data: any) => {
    await updateLicenseDetails(id, data);
    alert("Licence mise à jour !");
    loadData();
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-blue-600" />
          Tarifs & Limites des Licences
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {licenses.map((license) => (
          <LicenseCard key={license.id} license={license} onSave={handleSave} />
        ))}
      </div>
    </div>
  );
}

function LicenseCard({ license, onSave }: { license: any, onSave: any }) {
  const [data, setData] = useState({ ...license });

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="font-black text-lg text-slate-800 uppercase tracking-tighter">{data.name}</h3>
        <button onClick={() => onSave(license.id, data)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">
          <Save className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-6 space-y-4 flex-1">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Prix (XAF)</label>
          <input 
            type="number" 
            value={data.price} 
            onChange={(e) => setData({...data, price: e.target.value})}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none" 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Durée (Jours)</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="number" 
                value={data.durationDays} 
                onChange={(e) => setData({...data, durationDays: e.target.value})}
                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Max Utilisateurs</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="number" 
                value={data.maxUsers} 
                onChange={(e) => setData({...data, maxUsers: e.target.value})}
                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none" 
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-slate-700">Autoriser Téléchargement</span>
          </div>
          <input 
            type="checkbox" 
            checked={data.canDownload} 
            onChange={(e) => setData({...data, canDownload: e.target.checked})}
            className="w-5 h-5 accent-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
