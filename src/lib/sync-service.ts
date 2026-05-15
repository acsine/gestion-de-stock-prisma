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
   * Lance une synchronisation complète
   */
  static async syncAll() {
    if (this.isSyncing || !this.isLocal()) return;
    this.isSyncing = true;

    console.log("🔄 Début de la synchronisation...");
    const lastSyncDate = localStorage.getItem(LAST_SYNC_KEY) || "1970-01-01T00:00:00Z";
    const newSyncDate = new Date().toISOString();

    try {
      for (const model of SYNCABLE_MODELS) {
        await this.syncModel(model, lastSyncDate);
      }
      localStorage.setItem(LAST_SYNC_KEY, newSyncDate);
      console.log("✅ Synchronisation terminée avec succès.");
    } catch (error) {
      console.error("❌ Erreur de synchronisation:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchronise un modèle spécifique (PUSH puis PULL)
   */
  private static async syncModel(model: string, lastSyncDate: string) {
    try {
      // 1. PUSH : Envoyer les données locales non synchronisées vers le Cloud
      const localRes = await fetch(`/api/sync?model=${model}&lastSync=1970-01-01`);
      if (!localRes.ok) {
        console.warn(`[${model}] Échec de la lecture locale.`);
        return;
      }
      
      const { data: localData } = await localRes.json();
      const unsynced = localData?.filter((item: any) => !item.isSynced) || [];

      if (unsynced.length > 0) {
        console.log(`[${model}] Pushing ${unsynced.length} items to cloud...`);
        const pushRes = await fetch(CLOUD_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, data: unsynced }),
        });

        if (pushRes.ok) {
          // Marquer comme synchronisé localement
          await fetch(`/api/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              model, 
              data: unsynced.map((item: any) => ({ ...item, isSynced: true })) 
            }),
          });
        } else {
          console.warn(`[${model}] Échec de l'envoi vers le cloud.`);
        }
      }

      // 2. PULL : Récupérer les nouveautés du cloud vers le local
      const cloudRes = await fetch(`${CLOUD_API_URL}?model=${model}&lastSync=${lastSyncDate}`);
      if (cloudRes.ok) {
        const { data: cloudData } = await cloudRes.json();
        
        if (cloudData && cloudData.length > 0) {
          console.log(`[${model}] Pulling ${cloudData.length} items from cloud...`);
          
          // Sauvegarder les données du cloud dans la DB locale
          await fetch(`/api/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              model, 
              data: cloudData.map((item: any) => ({ ...item, isSynced: true })) 
            }),
          });
        }
      }
    } catch (error) {
      // Silently catch fetch errors (e.g. offline, DNS failure, CORS) to prevent UI crashes
      console.warn(`[${model}] Synchronisation ignorée (Réseau/Cloud inaccessible).`);
    }
  }
}
