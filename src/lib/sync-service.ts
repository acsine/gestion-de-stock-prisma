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
    return typeof window !== "undefined" && 
           (window.location.hostname === "localhost" || 
            window.location.hostname.includes("192.168.") ||
            window.location.hostname.includes("127.0.0.1") ||
            window.location.hostname.endsWith(".local"));
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
