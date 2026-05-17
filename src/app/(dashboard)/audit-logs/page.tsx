"use client";

import { useState } from "react";
import { useAuditLogs } from "@/hooks/useQueries";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { 
  Activity, Search, RotateCcw, ChevronLeft, ChevronRight, 
  User, Eye, EyeOff, Calendar, Clock, Database, Tag
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const ACTION_OPTIONS = [
  { value: "CREATE", label: "Créations" },
  { value: "UPDATE", label: "Modifications" },
  { value: "DELETE", label: "Suppressions" },
  { value: "ARCHIVE", label: "Archivages" },
];

const ENTITY_OPTIONS = [
  { value: "Product", label: "Produits" },
  { value: "StockMovement", label: "Mouvements de Stock" },
  { value: "Employee", label: "Employés" },
  { value: "Invoice", label: "Factures" },
  { value: "User", label: "Utilisateurs" },
];

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const pageSize = 15;

  const { data, isLoading } = useAuditLogs({
    search,
    action,
    entity,
    page,
    pageSize,
  });

  const logs = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleReset = () => {
    setIsResetting(true);
    setSearch("");
    setAction("");
    setEntity("");
    setPage(1);
    setTimeout(() => {
      setIsResetting(false);
    }, 650);
  };

  const getActionBadgeClass = (act: string) => {
    switch (act.toUpperCase()) {
      case "CREATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "UPDATE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELETE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ARCHIVE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getActionLabel = (act: string) => {
    switch (act.toUpperCase()) {
      case "CREATE":
        return "Création";
      case "UPDATE":
        return "Modification";
      case "DELETE":
        return "Suppression";
      case "ARCHIVE":
        return "Archivage";
      default:
        return act;
    }
  };

  const getEntityLabel = (ent: string) => {
    switch (ent) {
      case "Product":
        return "Produit";
      case "StockMovement":
        return "Mouvement de Stock";
      case "Employee":
        return "Employé";
      case "Invoice":
        return "Facture";
      case "User":
        return "Utilisateur";
      default:
        return ent;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Admin</span>;
      case "SUPERADMIN":
        return <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Super Admin</span>;
      case "GESTIONNAIRE_STOCK":
        return <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Stock</span>;
      case "VENDEUR":
        return <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Vendeur</span>;
      default:
        return <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{role}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
            <Activity className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
              Journal des Activités
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Consultez et auditez l'ensemble des actions effectuées par vos utilisateurs.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur, action..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <SearchableSelect
              options={ACTION_OPTIONS}
              value={action}
              onChange={(val) => {
                setAction(val);
                setPage(1);
              }}
              placeholder="Toutes les actions"
              className="w-full text-sm font-bold"
            />
          </div>

          <div>
            <SearchableSelect
              options={ENTITY_OPTIONS}
              value={entity}
              onChange={(val) => {
                setEntity(val);
                setPage(1);
              }}
              placeholder="Toutes les entités"
              className="w-full text-sm font-bold"
            />
          </div>

          <div>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-75"
            >
              <RotateCcw className={`w-4 h-4 text-slate-500 ${isResetting ? "animate-spin text-blue-600" : ""}`} />
              Recommencer
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table/List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-500">Chargement du journal d'activités...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Aucun log trouvé</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Aucune action enregistrée ne correspond à vos critères de recherche actuels.
              </p>
            </div>
            {(search || action || entity) && (
              <button
                onClick={handleReset}
                className="btn-secondary py-2 text-xs font-bold px-4"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log: any) => {
              const isExpanded = expandedId === log.id;
              const hasDiff = log.oldValue || log.newValue;

              return (
                <div key={log.id} className="transition-all hover:bg-slate-50/50">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* User and timestamp info */}
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black border border-slate-200/50 uppercase shadow-inner flex-shrink-0">
                        {log.user?.name?.slice(0, 2) || "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">
                            {log.user?.name || "Utilisateur supprimé"}
                          </span>
                          {log.user?.role && getRoleBadge(log.user.role)}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {log.user?.email || "Pas d'adresse email"}
                        </p>
                      </div>
                    </div>

                    {/* Action and targeted entity */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 md:justify-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black border uppercase shadow-sm ${getActionBadgeClass(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                      <span className="text-slate-400 font-bold text-xs">sur</span>
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200/60">
                        <Database className="w-3.5 h-3.5 text-slate-500" />
                        {getEntityLabel(log.entity)}
                      </span>
                      {log.entityId && (
                        <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
                          ID: {log.entityId.slice(-8)}
                        </span>
                      )}
                    </div>

                    {/* Date, time and details expander */}
                    <div className="flex items-center justify-between md:justify-end gap-6 flex-shrink-0">
                      <div className="flex items-center gap-3 text-slate-400">
                        <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-50 text-slate-600 px-2.5 py-1 rounded-xl border border-slate-200/50">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(log.timestamp, { day: "2-digit", month: "long" })}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-50 text-slate-600 px-2.5 py-1 rounded-xl border border-slate-200/50">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(log.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      {hasDiff && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isExpanded 
                              ? "bg-slate-800 text-white border-slate-800 shadow-md" 
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {isExpanded ? (
                            <>
                              <EyeOff className="w-4 h-4" /> Masquer
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" /> Détails
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON diff pane */}
                  {isExpanded && hasDiff && (
                    <div className="px-5 pb-5 pt-1 bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-800">
                        <div className="px-4 py-2 bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                          <span>Comparatif des données de l'action</span>
                          <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">JSON Diff</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                          {/* Old values */}
                          <div className="p-4 space-y-2">
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Valeurs précédentes (Old)</p>
                            {log.oldValue ? (
                              <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 scrollbar-thin">
                                {JSON.stringify(log.oldValue, null, 2)}
                              </pre>
                            ) : (
                              <p className="text-xs text-slate-500 italic">Aucune donnée précédente (Création)</p>
                            )}
                          </div>
                          {/* New values */}
                          <div className="p-4 space-y-2">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Valeurs nouvelles (New)</p>
                            {log.newValue ? (
                              <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 scrollbar-thin">
                                {JSON.stringify(log.newValue, null, 2)}
                              </pre>
                            ) : (
                              <p className="text-xs text-slate-500 italic">Aucune donnée nouvelle (Suppression)</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Affichage de <span className="font-bold text-slate-800">{logs.length}</span> sur <span className="font-bold text-slate-800">{total}</span> logs
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-bold text-slate-700 px-3">
                Page {page} sur {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
