"use client";
// src/components/layout/TopBar.tsx
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Search } from "lucide-react";
import { useAlerts } from "@/hooks/useQueries";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SyncIndicator } from "./SyncIndicator";

export function TopBar() {
  const { data: session } = useSession();
  const user = session?.user || {};
  const { data: alertData } = useAlerts();
  const alertCount = alertData?.data?.length || 0;
  const [search, setSearch] = useState("");
  const router = useRouter();

  return (
    <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) router.push(`/produits?search=${encodeURIComponent(search)}`); }}
            placeholder="Rechercher un produit, une facture..."
            className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all duration-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <SyncIndicator />
        
        <div className="h-8 w-px bg-slate-200"></div>

        <button
          onClick={() => router.push("/alertes")}
          className="relative p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 group"
        >
          <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          {alertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-4 pl-2">
          <div className="flex flex-col items-end hidden sm:flex">
            <p className="text-sm font-black text-slate-900 leading-none mb-1">{user.name}</p>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
              {typeof (user as any).role === 'string' 
                ? (user as any).role 
                : (user as any).role?.name || "Sans rôle"}
            </p>
          </div>
          
          <div className="relative group cursor-pointer">
            <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              {user.name?.[0]?.toUpperCase() || "?"}
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300 group"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
