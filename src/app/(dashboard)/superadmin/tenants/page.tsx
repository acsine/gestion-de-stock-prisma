// src/app/(dashboard)/superadmin/tenants/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getTenants, getLicenses, updateTenantLicense } from "@/app/actions/admin-actions";
import { Landmark, CheckCircle, XCircle, Clock, ShieldCheck } from "lucide-react";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [tData, lData] = await Promise.all([getTenants(), getLicenses()]);
    setTenants(tData);
    setLicenses(lData);
    setLoading(false);
  };

  const handleUpdate = async (tenantId: string, licenseId: string, active: boolean) => {
    await updateTenantLicense(tenantId, licenseId, active);
    loadData();
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2 sm:gap-3">
          <Landmark className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
          <span>Gestion des Marchands & Applications</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tenants.map((tenant) => {
          const isTrial = !tenant.licenseId;
          const isExpired = isTrial && tenant.trialEndsAt && new Date() > new Date(tenant.trialEndsAt);

          return (
            <div key={tenant.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl flex-shrink-0">
                  {tenant.name[0]}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-slate-800 truncate">{tenant.name}</h3>
                  <p className="text-sm text-slate-500 font-medium break-all">{tenant.email} • /{tenant.slug}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {tenant.subscriptionActive ? (
                      <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full border border-green-100">Actif</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-full border border-red-100">Suspendu</span>
                    )}
                    {isTrial ? (
                      <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase italic">
                        <Clock className="w-3 h-3" /> {isExpired ? "Essai Expiré" : "En Essai"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase">
                        <ShieldCheck className="w-3 h-3" /> {tenant.license?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end lg:items-center gap-4 w-full lg:w-auto">
                <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modifier Licence</label>
                  <select 
                    value={tenant.licenseId || ""}
                    onChange={(e) => handleUpdate(tenant.id, e.target.value, tenant.subscriptionActive)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 w-full min-w-[160px]"
                  >
                    <option value="">Sélectionner Licence</option>
                    {licenses.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.price.toLocaleString()} F)</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Action</label>
                  <button 
                    onClick={() => handleUpdate(tenant.id, tenant.licenseId, !tenant.subscriptionActive)}
                    className={`p-3 rounded-xl text-xs font-black uppercase transition-all w-full text-center ${
                      tenant.subscriptionActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                    }`}
                  >
                    {tenant.subscriptionActive ? "Suspendre" : "Réactiver"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
