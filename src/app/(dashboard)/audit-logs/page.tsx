"use client";

import { useState } from "react";
import { useAuditLogs } from "@/hooks/useQueries";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { 
  Activity, Search, RotateCcw, ChevronLeft, ChevronRight, 
  Eye, EyeOff, Calendar, Clock, Database
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/locales/i18n";

export default function AuditLogsPage() {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [viewMode, setViewMode] = useState<"simple" | "technical">("simple");

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

  const actionOptions = [
    { value: "CREATE", label: language === "fr" ? "Créations" : "Creations" },
    { value: "UPDATE", label: language === "fr" ? "Modifications" : "Modifications" },
    { value: "DELETE", label: language === "fr" ? "Suppressions" : "Deletions" },
    { value: "ARCHIVE", label: language === "fr" ? "Archivages" : "Archives" },
  ];

  const entityOptions = [
    { value: "Product", label: language === "fr" ? "Produits" : "Products" },
    { value: "StockMovement", label: language === "fr" ? "Mouvements de Stock" : "Stock Movements" },
    { value: "Employee", label: language === "fr" ? "Employés" : "Employees" },
    { value: "Invoice", label: language === "fr" ? "Factures" : "Invoices" },
    { value: "User", label: language === "fr" ? "Utilisateurs" : "Users" },
  ];

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
        return language === "fr" ? "Création" : "Creation";
      case "UPDATE":
        return language === "fr" ? "Modification" : "Modification";
      case "DELETE":
        return language === "fr" ? "Suppression" : "Deletion";
      case "ARCHIVE":
        return language === "fr" ? "Archivage" : "Archiving";
      default:
        return act;
    }
  };

  const getEntityLabel = (ent: string) => {
    switch (ent) {
      case "Product":
        return language === "fr" ? "Produit" : "Product";
      case "StockMovement":
        return language === "fr" ? "Mouvement de Stock" : "Stock Movement";
      case "Employee":
        return language === "fr" ? "Employé" : "Employee";
      case "Invoice":
        return language === "fr" ? "Facture" : "Invoice";
      case "User":
        return language === "fr" ? "Utilisateur" : "User";
      default:
        return ent;
    }
  };

  const getRoleBadge = (roleInput: any) => {
    const role = typeof roleInput === "string" ? roleInput : roleInput?.name || "";
    switch (role) {
      case "ADMIN":
        return <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Admin</span>;
      case "SUPERADMIN":
        return <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Super Admin</span>;
      case "GESTIONNAIRE_STOCK":
        return <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{language === "fr" ? "Stock" : "Stock"}</span>;
      case "VENDEUR":
        return <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{language === "fr" ? "Vendeur" : "Seller"}</span>;
      default:
        return <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{role || (language === "fr" ? "Sans rôle" : "No role")}</span>;
    }
  };

  const renderFriendlyDetails = (log: any) => {
    const oldVal = log.oldValue ? (typeof log.oldValue === "string" ? JSON.parse(log.oldValue) : log.oldValue) : null;
    const newVal = log.newValue ? (typeof log.newValue === "string" ? JSON.parse(log.newValue) : log.newValue) : null;

    const oldObj = (oldVal && typeof oldVal === "object") ? oldVal : {};
    const newObj = (newVal && typeof newVal === "object") ? newVal : {};

    const isTechnicalKey = (key: string) => {
      const lower = key.toLowerCase();
      return (
        lower === 'id' ||
        lower.endsWith('id') ||
        lower === 'issynced' ||
        lower === 'createdat' ||
        lower === 'updatedat' ||
        lower === 'deletedat' ||
        lower === 'isdeleted' ||
        lower === 'passwordhash' ||
        lower === 'password' ||
        lower === 'timestamp' ||
        lower === 'version' ||
        lower === 'token' ||
        lower === 'salt' ||
        lower === 'hash'
      );
    };

    const isIdValue = (val: any) => {
      if (typeof val !== "string") return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const cuidRegex = /^c[a-z0-9]{20,32}$/i;
      const defaultIdRegex = /^[a-z0-9]{24,30}$/i;
      return uuidRegex.test(val) || cuidRegex.test(val) || (val.length >= 20 && defaultIdRegex.test(val));
    };

    const formatKeyLabel = (key: string) => {
      const mapping: { [key: string]: { fr: string, en: string } } = {
        name: { fr: "Nom", en: "Name" },
        description: { fr: "Description", en: "Description" },
        price: { fr: "Prix", en: "Price" },
        buyPrice: { fr: "Prix d'achat", en: "Buy price" },
        sellPrice: { fr: "Prix de vente", en: "Sell price" },
        currentStock: { fr: "Stock actuel", en: "Current stock" },
        minStock: { fr: "Stock minimum", en: "Min stock" },
        quantity: { fr: "Quantité", en: "Quantity" },
        unit: { fr: "Unité", en: "Unit" },
        sku: { fr: "Code SKU", en: "SKU Code" },
        notes: { fr: "Notes", en: "Notes" },
        address: { fr: "Adresse", en: "Address" },
        phone: { fr: "Téléphone", en: "Phone" },
        email: { fr: "Email", en: "Email" },
        logo: { fr: "Logo", en: "Logo" },
        avatar: { fr: "Avatar", en: "Avatar" },
        attachment: { fr: "Pièce jointe", en: "Attachment" },
        status: { fr: "Statut", en: "Status" },
        expectedAt: { fr: "Date de livraison", en: "Delivery date" },
        durationDays: { fr: "Durée (jours)", en: "Duration (days)" },
        maxUsers: { fr: "Max Utilisateurs", en: "Max Users" },
        canDownload: { fr: "Autoriser Téléchargement", en: "Allow Download" },
        priceXAF: { fr: "Prix (XAF)", en: "Price (XAF)" },
        amount: { fr: "Montant", en: "Amount" },
        category: { fr: "Catégorie", en: "Category" },
        reference: { fr: "Référence", en: "Reference" },
        date: { fr: "Date", en: "Date" },
        isActive: { fr: "Actif", en: "Active" },
        type: { fr: "Type", en: "Type" },
        city: { fr: "Ville", en: "City" },
      };
      const entry = mapping[key];
      if (entry) {
        return language === "fr" ? entry.fr : entry.en;
      }
      return key.charAt(0).toUpperCase() + key.slice(1);
    };

    const renderValue = (val: any, key: string) => {
      if (val === null || val === undefined) return <span className="text-slate-400 italic">{language === "fr" ? "Vide" : "Empty"}</span>;
      if (typeof val === "boolean") {
        return val ? (
          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
            {language === "fr" ? "Oui" : "Yes"}
          </span>
        ) : (
          <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200">
            {language === "fr" ? "Non" : "No"}
          </span>
        );
      }

      // Check if value looks like a database ID
      if (isIdValue(val)) {
        return (
          <span className="text-slate-400 font-mono text-xs cursor-help" title={val}>
            •••••••• <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded border ml-1">{language === "fr" ? "ID système" : "System ID"}</span>
          </span>
        );
      }

      // Check if value is a URL or relative path starting with http or /
      const isUrl = typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/"));
      
      const isImageUrl = isUrl && (
        val.toLowerCase().includes(".png") ||
        val.toLowerCase().includes(".jpg") ||
        val.toLowerCase().includes(".jpeg") ||
        val.toLowerCase().includes(".webp") ||
        val.toLowerCase().includes(".gif") ||
        val.toLowerCase().includes("imagekit") ||
        val.toLowerCase().includes("upload") ||
        val.toLowerCase().includes("avatar") ||
        val.toLowerCase().includes("logo")
      );

      if (isImageUrl) {
        return (
          <div className="mt-1 inline-block group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
            <a href={val} target="_blank" rel="noopener noreferrer" className="relative flex items-center justify-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:scale-105">
              <img 
                src={val} 
                alt={formatKeyLabel(key)} 
                className="h-16 w-16 object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded-lg">
                  {language === "fr" ? "Agrandir" : "Zoom"}
                </span>
              </span>
            </a>
          </div>
        );
      }

      if (isUrl && !isImageUrl) {
        return (
          <a 
            href={val} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200/60 shadow-sm hover:shadow transition-all w-fit mt-1"
          >
            <span>🔗 {language === "fr" ? "Voir le document / lien" : "View document / link"}</span>
          </a>
        );
      }

      // Check if value is a price
      const isPrice = typeof val === "number" && (
        key.toLowerCase().includes("price") || 
        key.toLowerCase().includes("amount") || 
        key.toLowerCase().includes("xaf")
      );

      if (isPrice) {
        return <span className="font-mono font-bold text-slate-800">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(val)}</span>;
      }

      if (typeof val === "object") {
        return <pre className="text-[10px] font-mono bg-slate-50 p-1.5 rounded border text-slate-600">{JSON.stringify(val)}</pre>;
      }

      return <span className="text-slate-700 font-medium">{String(val)}</span>;
    };

    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
      .filter(key => !isTechnicalKey(key));

    const changedKeys = allKeys.filter(key => {
      const oldStr = JSON.stringify(oldObj[key]);
      const newStr = JSON.stringify(newObj[key]);
      return oldStr !== newStr;
    });

    if (changedKeys.length === 0) {
      return (
        <div className="p-4 bg-slate-50 rounded-xl border text-center text-slate-400 text-xs italic">
          {language === "fr" ? "Aucune modification sur les informations visibles." : "No visible modifications."}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
        {changedKeys.map(key => {
          const hasOld = key in oldObj;
          const hasNew = key in newObj;

          return (
            <div key={key} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2 transition-all hover:border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {formatKeyLabel(key)}
              </span>
              
              <div className="flex flex-col gap-1.5 flex-1 justify-center">
                {log.action === "CREATE" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">+</span>
                    {renderValue(newObj[key], key)}
                  </div>
                ) : log.action === "DELETE" ? (
                  <div className="flex items-center gap-2 opacity-75">
                    <span className="text-rose-500 font-black text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">-</span>
                    <span className="line-through text-slate-400">{renderValue(oldObj[key], key)}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hasOld && (
                      <div className="flex items-center gap-2 opacity-60 text-xs">
                        <span className="text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border">
                          {language === "fr" ? "Avant" : "Before"}
                        </span>
                        <span className="line-through text-slate-400">{renderValue(oldObj[key], key)}</span>
                      </div>
                    )}
                    {hasNew && (
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-blue-100">
                          {language === "fr" ? "Après" : "After"}
                        </span>
                        {renderValue(newObj[key], key)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
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
              {language === "fr" ? "Journal des Activités" : "Security & Audit Journal"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {language === "fr" 
                ? "Consultez et auditez l'ensemble des actions effectuées par vos utilisateurs." 
                : "View and audit all actions performed by your users."}
            </p>
          </div>
        </div>

        {/* View Mode Toggle Switch */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setViewMode("simple")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "simple"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {language === "fr" ? "Vue Simplifiée" : "Simplified View"}
          </button>
          <button
            onClick={() => setViewMode("technical")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "technical"
                ? "bg-white text-purple-600 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            {language === "fr" ? "Vue Technique" : "Technical View"}
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={language === "fr" ? "Rechercher un utilisateur, action..." : "Search user, action..."}
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
              options={actionOptions}
              value={action}
              onChange={(val) => {
                setAction(val);
                setPage(1);
              }}
              placeholder={language === "fr" ? "Toutes les actions" : "All actions"}
              className="w-full text-sm font-bold"
            />
          </div>

          <div>
            <SearchableSelect
              options={entityOptions}
              value={entity}
              onChange={(val) => {
                setEntity(val);
                setPage(1);
              }}
              placeholder={language === "fr" ? "Toutes les entités" : "All entities"}
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
              {language === "fr" ? "Recommencer" : "Reset"}
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table/List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-500">
              {language === "fr" ? "Chargement du journal d'activités..." : "Loading activity log..."}
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                {language === "fr" ? "Aucun log trouvé" : "No logs found"}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {language === "fr" 
                  ? "Aucune action enregistrée ne correspond à vos critères de recherche actuels." 
                  : "No recorded actions match your current search criteria."}
              </p>
            </div>
            {(search || action || entity) && (
              <button
                onClick={handleReset}
                className="btn-secondary py-2 text-xs font-bold px-4"
              >
                {language === "fr" ? "Réinitialiser les filtres" : "Reset filters"}
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
                            {log.user?.name || (language === "fr" ? "Utilisateur supprimé" : "Deleted user")}
                          </span>
                          {log.user?.role && getRoleBadge(log.user.role)}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {log.user?.email || (language === "fr" ? "Pas d'adresse email" : "No email address")}
                        </p>
                      </div>
                    </div>

                    {/* Action and targeted entity */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 md:justify-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black border uppercase shadow-sm ${getActionBadgeClass(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                      <span className="text-slate-400 font-bold text-xs">
                        {language === "fr" ? "sur" : "on"}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200/60">
                        <Database className="w-3.5 h-3.5 text-slate-500" />
                        {getEntityLabel(log.entity)}
                      </span>
                      {log.entityId && viewMode === "technical" && (
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
                          {new Date(log.timestamp).toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
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
                              <EyeOff className="w-4 h-4" /> {language === "fr" ? "Masquer" : "Hide"}
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" /> {language === "fr" ? "Détails" : "Details"}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON / Friendly diff pane */}
                  {isExpanded && hasDiff && (
                    <div className="px-5 pb-5 pt-1 bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
                      {viewMode === "simple" ? (
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200/80">
                          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                              <span className="text-xs font-bold text-slate-700">
                                {language === "fr" ? "Détails simplifiés (Recommandé)" : "Simplified Details (Recommended)"}
                              </span>
                            </div>
                            <button 
                              onClick={() => setViewMode("technical")}
                              className="text-[10px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-xl transition-all"
                            >
                              {language === "fr" ? "Code technique (JSON)" : "Technical Code (JSON)"}
                            </button>
                          </div>
                          <div className="p-4 bg-slate-50/30">
                            {renderFriendlyDetails(log)}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800">
                          <div className="px-4 py-2.5 bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                            <span>
                              {language === "fr" ? "Comparatif des données de l'action" : "Action Data Comparison"}
                            </span>
                            <button 
                              onClick={() => setViewMode("simple")}
                              className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-md font-mono transition-colors border border-slate-700"
                            >
                              {language === "fr" ? "Vue simplifiée" : "Simplified view"}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                            {/* Old values */}
                            <div className="p-4 space-y-2">
                              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                                {language === "fr" ? "Valeurs précédentes (Old)" : "Previous Values (Old)"}
                              </p>
                              {log.oldValue ? (
                                <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 scrollbar-thin">
                                  {JSON.stringify(log.oldValue, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-xs text-slate-500 italic">
                                  {language === "fr" ? "Aucune donnée précédente (Création)" : "No previous data (Creation)"}
                                </p>
                              )}
                            </div>
                            {/* New values */}
                            <div className="p-4 space-y-2">
                              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                {language === "fr" ? "Valeurs nouvelles (New)" : "New Values (New)"}
                              </p>
                              {log.newValue ? (
                                <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 scrollbar-thin">
                                  {JSON.stringify(log.newValue, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-xs text-slate-500 italic">
                                  {language === "fr" ? "Aucune donnée nouvelle (Suppression)" : "No new data (Deletion)"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
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
              {language === "fr" ? "Affichage de" : "Showing"}{" "}
              <span className="font-bold text-slate-800">{logs.length}</span>{" "}
              {language === "fr" ? "sur" : "of"}{" "}
              <span className="font-bold text-slate-800">{total}</span> logs
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
                {language === "fr" ? `Page ${page} sur ${totalPages}` : `Page ${page} of ${totalPages}`}
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
