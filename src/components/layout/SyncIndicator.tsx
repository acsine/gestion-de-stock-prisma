// src/components/layout/SyncIndicator.tsx
"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { SyncService } from "@/lib/sync-service";

export function SyncIndicator() {
  const [status, setStatus] = useState<"online" | "offline" | "syncing">("online");
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    setIsLocal(SyncService.isLocal());

    const checkStatus = () => {
      setStatus(navigator.onLine ? "online" : "offline");
    };

    window.addEventListener("online", checkStatus);
    window.addEventListener("offline", checkStatus);
    checkStatus();

    // Boucle de synchro toutes les 2 minutes si en local
    const interval = setInterval(() => {
      if (navigator.onLine && SyncService.isLocal()) {
        performSync();
      }
    }, 120000);

    return () => {
      window.removeEventListener("online", checkStatus);
      window.removeEventListener("offline", checkStatus);
      clearInterval(interval);
    };
  }, []);

  const performSync = async () => {
    if (status === "offline") return;
    setStatus("syncing");
    await SyncService.syncAll();
    setStatus(navigator.onLine ? "online" : "offline");
  };

  if (!isLocal) return null; // N'affiche l'indicateur que sur la version locale

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-secondary/50">
      {status === "syncing" ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          <span>Synchro...</span>
        </>
      ) : status === "online" ? (
        <>
          <Cloud className="w-4 h-4 text-green-500" />
          <span className="cursor-pointer" onClick={performSync}>Connecté</span>
        </>
      ) : (
        <>
          <CloudOff className="w-4 h-4 text-red-500" />
          <span>Hors ligne</span>
        </>
      )}
    </div>
  );
}
