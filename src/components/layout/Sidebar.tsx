"use client";
// src/components/layout/Sidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, Package, Tags, ArrowLeftRight, FileText, 
  ShoppingCart, Users, UserCircle, BarChart3, 
  Bell, Settings, ChevronLeft, ChevronRight, Boxes, Wallet,
  ClipboardList, Building2, Loader2, Download,
  Database, ShieldAlert, LifeBuoy, CreditCard, Landmark, Activity,
  LogOut, X
} from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import { useAlerts } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/components/auth/HasPermission";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "@/locales/i18n";

const nav = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, permission: "dashboard.view" },
  
  { label: "STOCK", type: "section" },
  { href: "/produits", label: "Produits", icon: Package, permission: "products.view" },
  { href: "/categories", label: "Catégories", icon: Tags, permission: "categories.manage" },
  { href: "/stock", label: "Mouvements", icon: ArrowLeftRight, permission: "stock.view" },
  { href: "/alertes", label: "Alertes", icon: Bell, permission: "products.view", badge: true },
  
  { label: "COMMERCIAL", type: "section" },
  { href: "/caisse", label: "Caisse (POS)", icon: ShoppingCart, permission: "pos.access" },
  { href: "/factures", label: "Factures", icon: FileText, permission: "invoices.view" },
  { href: "/commandes", label: "Bons de commande", icon: Package, permission: "orders.view" },
  { href: "/clients", label: "Clients", icon: Users, permission: "clients.view" },
  { href: "/fournisseurs", label: "Fournisseurs", icon: Building2, permission: "orders.view" },
  
  { label: "FINANCES & RH", type: "section" },
  { href: "/finances", label: "Finances", icon: Wallet, permission: "finances.view" },
  { href: "/employes", label: "Employés", icon: UserCircle, permission: "employees.view" },
  { href: "/salaires", label: "Salaires", icon: ClipboardList, permission: "employees.view" },
  
  { label: "ANALYTIQUE", type: "section" },
  { href: "/rapports", label: "Rapports", icon: BarChart3, permission: "rapports.view" },
  
  { label: "ADMINISTRATION", type: "section" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, permission: "users.manage" },
  { href: "/parametres", label: "Paramètres", icon: Settings, permission: "settings.manage" },
  { href: "/audit-logs", label: "Journal d'activités", icon: Activity, permission: "settings.manage" },
  { href: "/support", label: "Aide & Support", icon: LifeBuoy },
  
  { label: "SYSTÈME (SUPERADMIN)", type: "section", superAdminOnly: true },
  { href: "/superadmin/tenants", label: "Marchands & Apps", icon: Landmark, superAdminOnly: true },
  { href: "/superadmin/licences", label: "Licences & Tarifs", icon: ShieldAlert, superAdminOnly: true },
  { href: "/superadmin/paiements", label: "Validation Paiements", icon: CreditCard, superAdminOnly: true },
  { href: "/superadmin/sql", label: "Console SQL (DB)", icon: Database, superAdminOnly: true },
  { href: "/superadmin/support", label: "Support Client", icon: LifeBuoy, superAdminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { data: alertData } = useAlerts();
  const { role, hasPermission } = usePermissions();
  const { data: session } = useSession();
  const { language, setLanguage, t } = useTranslation();
  const alertCount = alertData?.data?.length || 0;
  const [loggingOut, setLoggingOut] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut({ redirect: false });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const handleDownloadZip = (e: React.MouseEvent) => {
    e.preventDefault();
    setDownloadingZip(true);
    try {
      const a = document.createElement("a");
      a.href = "/setup_thaborsolution.zip";
      a.download = "setup_thaborsolution.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Error downloading ZIP:", error);
    } finally {
      // Rétablir l'état du bouton après un court instant
      setTimeout(() => {
        setDownloadingZip(false);
      }, 1500);
    }
  };

  const handleDownloadKey = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadingKey) return;
    setDownloadingKey(true);
    try {
      const response = await fetch("/api/setup/config");
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "setup_config.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading Key:", error);
      const a = document.createElement("a");
      a.href = "/api/setup/config";
      a.download = "setup_config.json";
      a.click();
    } finally {
      setTimeout(() => {
        setDownloadingKey(false);
      }, 800);
    }
  };

  // Reset loading state and collapse sidebar when pathname changes (after load completes)
  useEffect(() => {
    setNavigatingTo(null);
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const canAccess = (item: any) => {
    const isSuper = (session?.user as any)?.isSuperAdmin;
    
    // If item is superAdminOnly, only allow superadmins
    if (item.superAdminOnly && !isSuper) return false;
    
    // Superadmin has access to everything
    if (isSuper) return true;
    
    if (item.permission === "ALL") return true;
    if (!item.permission) return true;
    return hasPermission(item.permission);
  };

  const getTranslatedLabel = (item: any) => {
    if (item.type === "section") {
      if (item.label === "STOCK") return "STOCK";
      if (item.label === "COMMERCIAL") return "COMMERCIAL";
      if (item.label === "FINANCES & RH") return language === "fr" ? "FINANCES & RH" : "FINANCES & HR";
      if (item.label === "ANALYTIQUE") return language === "fr" ? "ANALYTIQUE" : "ANALYTICS";
      if (item.label === "ADMINISTRATION") return "ADMINISTRATION";
      if (item.label === "SYSTÈME (SUPERADMIN)") return language === "fr" ? "SYSTÈME (SUPERADMIN)" : "SYSTEM (SUPERADMIN)";
      return item.label;
    }
    switch (item.href) {
      case "/dashboard": return t.nav.dashboard;
      case "/produits": return t.nav.products;
      case "/categories": return t.nav.categories;
      case "/stock": return language === "fr" ? "Mouvements" : "Stock Movements";
      case "/alertes": return language === "fr" ? "Alertes" : "Alerts";
      case "/caisse": return language === "fr" ? "Caisse (POS)" : "Cashier (POS)";
      case "/factures": return t.nav.invoices;
      case "/commandes": return t.nav.orders;
      case "/clients": return t.nav.customers;
      case "/fournisseurs": return t.nav.suppliers;
      case "/finances": return t.nav.finances;
      case "/employes": return t.nav.employees;
      case "/salaires": return t.nav.salaires;
      case "/rapports": return language === "fr" ? "Rapports" : "Reports";
      case "/utilisateurs": return t.nav.users;
      case "/parametres": return t.nav.settings;
      case "/audit-logs": return language === "fr" ? "Journal d'activités" : "Activity Logs";
      case "/support": return language === "fr" ? "Aide & Support" : "Help & Support";
      case "/superadmin/tenants": return language === "fr" ? "Marchands & Apps" : "Merchants & Apps";
      case "/superadmin/licences": return language === "fr" ? "Licences & Tarifs" : "Licenses & Pricing";
      case "/superadmin/paiements": return language === "fr" ? "Validation Paiements" : "Payment Validation";
      case "/superadmin/sql": return language === "fr" ? "Console SQL (DB)" : "SQL Console (DB)";
      case "/superadmin/support": return t.nav.support;
      default: return item.label;
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "bg-gradient-to-b from-white/95 via-white/90 to-sky-50/95 backdrop-blur-xl text-slate-800 flex flex-col transition-all duration-300 z-40 fixed md:relative inset-y-0 left-0 flex-shrink-0 shadow-xl border-r border-slate-200/60",
          sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden"
        )}
      >
      {/* Logo */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200/60 bg-transparent">
        {sidebarOpen && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight uppercase text-slate-800">ThaborSolution</span>
          </div>
        )}
        {!sidebarOpen && (
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto">
            <Boxes className="w-6 h-6 text-white" />
          </div>
        )}
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        {nav.map((item, i) => {
          const transLabel = getTranslatedLabel(item);
          if ((item as any).type === "section") {
            if (!sidebarOpen) return <div key={i} className="my-6 border-t border-slate-200/60 mx-2" />;
            return (
              <p key={i} className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-3 pt-6 pb-2">
                {transLabel}
              </p>
            );
          }

          if (!canAccess(item)) return null;

          const Icon = item.icon as any;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href!));
          const isNavigating = navigatingTo === item.href;

          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setNavigatingTo(item.href!)}
              title={!sidebarOpen ? transLabel : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                !sidebarOpen && "justify-center px-0 h-12 w-12 mx-auto",
                isNavigating && "opacity-80 pointer-events-none"
              )}
            >
              {isActive && (
                <motion.div 
                   layoutId="active-nav"
                  className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <div className="relative flex-shrink-0">
                {isNavigating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                ) : (
                  typeof Icon !== "string" && <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "text-slate-600 group-hover:text-slate-700")} />
                )}
                {item.badge && alertCount > 0 && !isNavigating && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </div>
              {sidebarOpen && <span className="truncate">{transLabel}</span>}
              {sidebarOpen && item.badge && alertCount > 0 && !isNavigating && (
                <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-black rounded-full px-2 py-0.5 border border-red-500/30">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Download Local Version */}
      {(session?.user as any)?.canDownload && (
        <div className="px-4 py-3">
          <button 
            onClick={() => setIsSetupModalOpen(true)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-2xl bg-blue-600/10 text-blue-600 border border-blue-600/20 hover:bg-blue-600/20 transition-all group",
              !sidebarOpen && "justify-center p-2"
            )}
            title={language === "fr" ? "Installer la version locale" : "Install local version"}
          >
            <Download className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
            {sidebarOpen && <span className="text-xs font-black uppercase tracking-widest text-left">{language === "fr" ? "Version Locale" : "Local Version"}</span>}
          </button>
        </div>
      )}

      {/* Language Switcher */}
      {sidebarOpen ? (
        <div className="px-6 py-3 border-t border-slate-200/60 flex gap-2">
          <button
            onClick={() => setLanguage("fr")}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-black transition-all border border-slate-200",
              language === "fr" ? "bg-blue-600 text-white shadow-lg border-transparent shadow-blue-500/20" : "text-slate-600 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            FR
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-black transition-all border border-slate-200",
              language === "en" ? "bg-blue-600 text-white shadow-lg border-transparent shadow-blue-500/20" : "text-slate-600 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            EN
          </button>
        </div>
      ) : (
        <div className="py-3 border-t border-slate-200/60 flex justify-center">
          <button
            onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-blue-600 hover:bg-slate-100 transition-all"
            title={language === "fr" ? "Switch to English" : "Passer en Français"}
          >
            {language.toUpperCase()}
          </button>
        </div>
      )}

      {/* User Card */}
      <div className="p-4 border-t border-slate-200/60 bg-transparent flex flex-col gap-2">
        <div className={cn("flex items-center gap-3 p-2 rounded-2xl transition-colors", sidebarOpen ? "bg-slate-50 border border-slate-150" : "justify-center")}>
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
            {String(role || "?")[0]?.toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-blue-600 font-black uppercase tracking-widest leading-none mb-1">
                  {typeof role === 'string' ? role : (role as any)?.name || "MEMBRE"}
                </p>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {(session as any)?.user?.name || "Utilisateur"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-2 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all shrink-0 ml-2 disabled:opacity-50"
                title={language === "fr" ? "Se déconnecter" : "Log Out"}
              >
                {loggingOut ? <Loader2 className="w-5 h-5 animate-spin text-rose-500" /> : <LogOut className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
        {!sidebarOpen && (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-10 h-10 mx-auto bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
            title={language === "fr" ? "Se déconnecter" : "Log Out"}
          >
            {loggingOut ? <Loader2 className="w-5 h-5 animate-spin text-rose-500" /> : <LogOut className="w-5 h-5" />}
          </button>
        )}
      </div>
      </aside>

      {/* Full-screen logout overlay */}
      {loggingOut && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-lg font-bold text-slate-700">
            {language === "fr" ? "Déconnexion en cours..." : "Logging out..."}
          </p>
        </div>
      )}

      {/* Modal d'installation locale et synchronisation */}
      <AnimatePresence>
        {isSetupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSetupModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-slate-955 bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 shadow-2xl p-6 md:p-8 text-white z-10"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {language === "fr" ? "Version Locale & Synchronisation" : "Local Version & Synchronization"}
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    {language === "fr" 
                      ? "Faites fonctionner ThaborSolution sur votre ordinateur, même hors ligne !" 
                      : "Run ThaborSolution on your computer, even offline!"}
                  </p>
                </div>
                <button 
                  onClick={() => setIsSetupModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-6">
                <p className="text-sm text-white/80 leading-relaxed">
                  {language === "fr" 
                    ? "L'installateur local configurera automatiquement tous les outils requis (Node.js, PostgreSQL) et importera vos données. Suivez les étapes ci-dessous pour démarrer :" 
                    : "The local installer will automatically configure all required tools (Node.js, PostgreSQL) and import your data. Follow the steps below to start:"}
                </p>

                {/* Steps Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Step 1 */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between hover:border-blue-500/30 transition-all group">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center font-black mb-3">
                        1
                      </div>
                      <h4 className="font-bold text-sm mb-1">
                        {language === "fr" ? "Télécharger l'installateur" : "Download Installer"}
                      </h4>
                      <p className="text-xs text-white/40 leading-relaxed mb-4">
                        {language === "fr" 
                          ? "Contient le script d'installation automatisé complet (.zip)." 
                          : "Contains the complete automated installation package (.zip)."}
                      </p>
                    </div>
                    <button 
                      onClick={handleDownloadZip}
                      disabled={downloadingZip}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      {downloadingZip ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {downloadingZip 
                        ? (language === "fr" ? "Téléchargement..." : "Downloading...") 
                        : (language === "fr" ? "Télécharger le ZIP" : "Download ZIP")}
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between hover:border-indigo-500/30 transition-all group">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center font-black mb-3">
                        2
                      </div>
                      <h4 className="font-bold text-sm mb-1">
                        {language === "fr" ? "Clé de synchronisation" : "Sync Key"}
                      </h4>
                      <p className="text-xs text-white/40 leading-relaxed mb-4">
                        {language === "fr" 
                          ? "Clé de configuration automatique liée à votre compte actuel." 
                          : "Automated configuration key linked to your current account."}
                      </p>
                    </div>
                    <button 
                      onClick={handleDownloadKey}
                      disabled={downloadingKey}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      {downloadingKey ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                      {downloadingKey 
                        ? (language === "fr" ? "Génération..." : "Generating...") 
                        : (language === "fr" ? "Télécharger la clé" : "Download Key")}
                    </button>
                  </div>
                </div>

                {/* Instruction Banner */}
                <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-xs text-blue-400 flex gap-3">
                  <div className="shrink-0 mt-0.5 font-bold uppercase tracking-widest text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded h-fit">
                    {language === "fr" ? "GUIDE" : "GUIDE"}
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white">
                      {language === "fr" ? "Comment finaliser l'installation ?" : "How to complete the installation?"}
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-white/70">
                      <li>{language === "fr" ? "Décompressez l'installateur ZIP dans un dossier vide sur votre PC." : "Extract the ZIP installer into an empty folder on your PC."}</li>
                      <li>{language === "fr" ? "Déposez le fichier setup_config.json téléchargé à l'étape 2 dans ce même dossier." : "Place the setup_config.json file downloaded in Step 2 into this same folder."}</li>
                      <li>{language === "fr" ? "Double-cliquez sur setup.bat pour lancer l'installation !" : "Double-click setup.bat to launch the installation!"}</li>
                    </ol>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
