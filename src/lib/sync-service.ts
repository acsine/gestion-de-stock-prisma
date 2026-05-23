// src/lib/sync-service.ts
import { SYNCABLE_MODELS } from "./sync-config";

const CLOUD_API_URL = process.env.NEXT_PUBLIC_APP_URL + "/api/sync";
const LAST_SYNC_KEY = "thaborsolution_last_sync_date";

export class SyncService {
  private static isSyncing = false;

  /**
   * Vérifie si nous sommes en mode local
   */
  static isLocal() {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname;
    
    if (
      hostname === "localhost" || 
      hostname === "127.0.0.1" || 
      hostname.endsWith(".local")
    ) {
      return true;
    }
    
    const parts = hostname.split(".");
    if (parts.length === 4) {
      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);
      if (
        first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
      ) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Lance une synchronisation complète via le serveur local
   */
  static async syncAll() {
    if (this.isSyncing || !this.isLocal()) return;
    this.isSyncing = true;

    console.log("🔄 Début de la synchronisation sécurisée via le serveur...");

    try {
      const res = await fetch("/api/sync/cloud", {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Une erreur est survenue lors de la synchronisation");
      }

      const data = await res.json();
      console.log("✅ Synchronisation serveur-à-serveur réussie :", data.report);
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation :", error);
    } finally {
      this.isSyncing = false;
    }
  }
}
