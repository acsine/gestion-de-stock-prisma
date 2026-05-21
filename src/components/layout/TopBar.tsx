"use client";
// src/components/layout/TopBar.tsx
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Search, Menu, Globe, ChevronDown, Loader2 } from "lucide-react";
import { useAlerts } from "@/hooks/useQueries";
import { useState } from "react";
import { useUIStore } from "@/stores/useUIStore";
import { useRouter } from "next/navigation";
import { SyncIndicator } from "./SyncIndicator";
import { useTranslation } from "@/locales/i18n";

export function TopBar() {
  const { data: session } = useSession();
  const user = session?.user || {};
  const { data: alertData } = useAlerts();
  const alertCount = alertData?.data?.length || 0;
  const [search, setSearch] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const { toggleSidebar } = useUIStore();
  const { language, setLanguage } = useTranslation();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut({ redirect: false });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <>
    <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-xs sm:max-w-xl">
        <button
          onClick={toggleSidebar}
          className="p-2 sm:p-2.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all duration-300 flex-shrink-0"
          title="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative flex-1 group hidden sm:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                const isFactures = window.location.pathname.startsWith("/factures");
                router.push(isFactures ? `/factures?search=${encodeURIComponent(search)}` : `/produits?search=${encodeURIComponent(search)}`);
              }
            }}
            placeholder={language === "fr" ? "Rechercher un produit, une facture..." : "Search for a product, invoice..."}
            className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all duration-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        <SyncIndicator />
        
        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

        {/* Language Selector Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 p-2 px-2.5 sm:px-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 border border-slate-150 bg-slate-50/50">
            <Globe className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-xs font-black uppercase tracking-wider">{language}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </button>
          
          <div className="absolute right-0 mt-2 w-32 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 py-1.5 z-50">
            <button
              onClick={() => setLanguage("fr")}
              className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${
                language === "fr" ? "text-blue-600 bg-blue-50/50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>Français</span>
              {language === "fr" && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${
                language === "en" ? "text-blue-600 bg-blue-50/50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>English</span>
              {language === "en" && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
            </button>
          </div>
        </div>

        <button
          onClick={() => router.push("/alertes")}
          className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 group"
        >
          <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 sm:gap-4 pl-1 sm:pl-2">
          <div className="flex flex-col items-end hidden sm:flex">
            <p className="text-sm font-black text-slate-900 leading-none mb-1">{user.name}</p>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
              {typeof (user as any).role === 'string' 
                ? (user as any).role 
                : (user as any).role?.name || "Sans rôle"}
            </p>
          </div>
          
          <div className="relative group cursor-pointer">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-sm sm:text-lg shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              {user.name?.[0]?.toUpperCase() || "?"}
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300 group disabled:opacity-50"
            title={language === "fr" ? "Déconnexion" : "Log Out"}
          >
            {loggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
            ) : (
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </div>
      </div>
    </header>

    {/* Full-screen logout overlay */}
    {loggingOut && (
      <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-lg font-bold text-slate-700">
          {language === "fr" ? "Déconnexion en cours..." : "Logging out..."}
        </p>
      </div>
    )}
    </>
  );
}
