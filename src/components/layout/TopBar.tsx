"use client";
// src/components/layout/TopBar.tsx
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Search } from "lucide-react";
import { useAlerts } from "@/hooks/useQueries";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TopBar() {
  const { data: session } = useSession();
  const user = session?.user || {};
  const { data: alertData } = useAlerts();
  const alertCount = alertData?.data?.length || 0;
  const [search, setSearch] = useState("");
  const router = useRouter();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) router.push(`/produits?search=${encodeURIComponent(search)}`); }}
            placeholder="Rechercher un produit…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/alertes")}
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">
              {typeof (user as any).role === 'string' 
                ? (user as any).role 
                : (user as any).role?.name || "Sans rôle"}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
