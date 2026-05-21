// src/app/(dashboard)/superadmin/tenants/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getTenants, getLicenses, updateTenantLicense, toggleUserActiveStatus } from "@/app/actions/admin-actions";
import { Landmark, CheckCircle, XCircle, Clock, ShieldCheck, Users, Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useTranslation } from "@/locales/i18n";

export default function AdminTenantsPage() {
  const { t, language } = useTranslation();
  const [tenants, setTenants] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState<Record<string, boolean>>({});

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

  const handleToggleUserStatus = async (userId: string, targetStatus: boolean) => {
    setProcessingUsers(prev => ({ ...prev, [userId]: true }));
    try {
      await toggleUserActiveStatus(userId, targetStatus);
      await loadData();
    } catch (err) {
      console.error("Error toggling user status:", err);
    } finally {
      setProcessingUsers(prev => ({ ...prev, [userId]: false }));
    }
  };

  const licenseOptions = licenses.map(l => ({
    value: l.id,
    label: `${l.name} (${l.price.toLocaleString()} F)`,
  }));

  if (loading) return <div>{t.actions.loading}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2 sm:gap-3">
          <Landmark className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
          <span>{language === "fr" ? "Gestion des Marchands & Applications" : "Merchant & Application Management"}</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tenants.map((tenant) => {
          const isTrial = !tenant.licenseId;
          const isExpired = isTrial && tenant.trialEndsAt && new Date() > new Date(tenant.trialEndsAt);

          return (
            <div key={tenant.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all w-full">
              {/* Tenant Info & Control Row */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl flex-shrink-0">
                    {tenant.name[0]}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-slate-800 truncate">{tenant.name}</h3>
                    <p className="text-sm text-slate-500 font-medium break-all">{tenant.email} • /{tenant.slug}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {tenant.subscriptionActive ? (
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full border border-green-100">{t.common.active}</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-full border border-red-100">{language === "fr" ? "Suspendu" : "Suspended"}</span>
                      )}
                      {isTrial ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase italic">
                          <Clock className="w-3 h-3" /> {isExpired ? (language === "fr" ? "Essai Expiré" : "Trial Expired") : (language === "fr" ? "En Essai" : "On Trial")}
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === "fr" ? "Modifier Licence" : "Edit License"}</label>
                    <SearchableSelect
                      options={licenseOptions}
                      value={tenant.licenseId || ""}
                      onChange={(val) => handleUpdate(tenant.id, val, tenant.subscriptionActive)}
                      placeholder={language === "fr" ? "Sélectionner Licence" : "Select License"}
                      className="w-full min-w-[160px] text-xs font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">{t.actions.actions}</label>
                    <button 
                      onClick={() => handleUpdate(tenant.id, tenant.licenseId, !tenant.subscriptionActive)}
                      className={`p-3 rounded-xl text-xs font-black uppercase transition-all w-full text-center ${
                        tenant.subscriptionActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                      }`}
                    >
                      {tenant.subscriptionActive ? (language === "fr" ? "Suspendre" : "Suspend") : (language === "fr" ? "Réactiver" : "Reactivate")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full border-t border-slate-100 my-1" />

              {/* Users List Section */}
              <div className="w-full space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {language === "fr" 
                      ? `Utilisateurs (${tenant.users?.length || 0})` 
                      : `Users (${tenant.users?.length || 0})`}
                  </span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(tenant.users || []).map((user: any) => {
                    const isProcessing = processingUsers[user.id];
                    return (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Avatar Circle */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            user.isActive ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"
                          }`}>
                            {user.name ? user.name[0].toUpperCase() : "U"}
                          </div>
                          
                          {/* Details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-slate-800 truncate leading-snug">{user.name}</p>
                              {user.role && (
                                <span className="px-1.5 py-0.5 bg-slate-200/60 text-slate-600 text-[8px] font-black uppercase rounded">
                                  {user.role.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate leading-normal">{user.email}</p>
                          </div>
                        </div>

                        {/* Status Toggle Action Button */}
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          {/* Mini Status Badge */}
                          <span className={`inline-flex w-2 h-2 rounded-full ${
                            user.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"
                          }`} />
                          
                          <button
                            disabled={isProcessing}
                            onClick={() => handleToggleUserStatus(user.id, !user.isActive)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center min-w-[75px] ${
                              user.isActive 
                                ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100" 
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                            }`}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : user.isActive ? (
                              language === "fr" ? "Suspendre" : "Suspend"
                            ) : (
                              language === "fr" ? "Activer" : "Activate"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
