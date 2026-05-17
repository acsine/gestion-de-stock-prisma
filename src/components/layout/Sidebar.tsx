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
  Database, ShieldAlert, LifeBuoy, CreditCard, Landmark, Activity
} from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import { useAlerts } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/components/auth/HasPermission";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

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
  const alertCount = alertData?.data?.length || 0;

  // Reset loading state when pathname changes
  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

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

  return (
    <>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "bg-slate-900 text-white flex flex-col transition-all duration-300 z-40 fixed md:relative inset-y-0 left-0 flex-shrink-0 shadow-2xl shadow-slate-900/50",
          sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden"
        )}
      >
      {/* Logo */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-white/5 bg-white/5">
        {sidebarOpen && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight uppercase">ThaborSolution</span>
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
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        {nav.map((item, i) => {
          if ((item as any).type === "section") {
            if (!sidebarOpen) return <div key={i} className="my-6 border-t border-white/5 mx-2" />;
            return (
              <p key={i} className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-3 pt-6 pb-2">
                {item.label}
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
              title={!sidebarOpen ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-white/50 hover:bg-white/5 hover:text-white",
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
                  typeof Icon !== "string" && <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "text-white/40 group-hover:text-white")} />
                )}
                {item.badge && alertCount > 0 && !isNavigating && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-slate-900">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </div>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
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
          <a 
            href="/setup_thaborsolution.zip" 
            download 
            className={cn(
              "flex items-center gap-3 p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 transition-all group",
              !sidebarOpen && "justify-center p-2"
            )}
            title="Télécharger la version locale"
          >
            <Download className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
            {sidebarOpen && <span className="text-xs font-black uppercase tracking-widest">Version Locale</span>}
          </a>
        </div>
      )}

      {/* User Card */}
      <div className="p-4 border-t border-white/5 bg-white/5">
        <div className={cn("flex items-center gap-3 p-2 rounded-2xl transition-colors", sidebarOpen ? "bg-white/5" : "justify-center")}>
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
            {String(role || "?")[0]?.toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-xs text-blue-400 font-black uppercase tracking-widest leading-none mb-1">
                {typeof role === 'string' ? role : (role as any)?.name || "MEMBRE"}
              </p>
              <p className="text-sm font-bold text-white truncate">
                {(session as any)?.user?.name || "Utilisateur"}
              </p>
            </div>
          )}
        </div>
      </div>
      </aside>
    </>
  );
}
