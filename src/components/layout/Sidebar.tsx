"use client";
// src/components/layout/Sidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, Package, Tags, ArrowLeftRight, FileText, 
  ShoppingCart, Users, UserCircle, BarChart3, 
  Bell, Settings, ChevronLeft, ChevronRight, Boxes, Wallet,
  ClipboardList, Building2, Loader2
} from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import { useAlerts } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/components/auth/HasPermission";

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
];

export function Sidebar() {
  const pathname = usePathname();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { data: alertData } = useAlerts();
  const { role, hasPermission } = usePermissions();
  const alertCount = alertData?.data?.length || 0;

  // Reset loading state when pathname changes
  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const canAccess = (item: any) => {
    if (item.permission === "ALL") return true;
    if (!item.permission) return true;
    return hasPermission(item.permission);
  };

  return (
    <aside
      className={cn(
        "bg-sidebar text-white flex flex-col transition-all duration-300 z-20 relative flex-shrink-0",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <Boxes className="w-7 h-7 text-blue-400" />
            <span className="font-bold text-lg">Sachand</span>
          </div>
        )}
        {!sidebarOpen && <Boxes className="w-7 h-7 text-blue-400 mx-auto" />}
        <button
          onClick={toggleSidebar}
          className={cn("p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors", !sidebarOpen && "mx-auto mt-0")}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {nav.map((item, i) => {
          if ((item as any).type === "section") {
            if (!sidebarOpen) return <div key={i} className="my-2 border-t border-white/10" />;
            return (
              <p key={i} className="text-xs font-semibold text-white/40 uppercase tracking-wider px-3 pt-4 pb-1">
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
                !sidebarOpen && "justify-center px-2",
                isNavigating && "opacity-80 pointer-events-none"
              )}
            >
              <div className="relative flex-shrink-0">
                {isNavigating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                ) : (
                  typeof Icon !== "string" && <Icon className="w-5 h-5" />
                )}
                {item.badge && alertCount > 0 && !isNavigating && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </div>
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && item.badge && alertCount > 0 && !isNavigating && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {sidebarOpen && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {String(role || "?")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/50 truncate uppercase tracking-tighter font-bold">
            {typeof role === 'string' ? role : (role as any)?.name || "UTILISATEUR"}
          </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
