// src/lib/sync-service.ts
import { SYNCABLE_MODELS } from "./sync-config";

const CLOUD_API_URL = process.env.NEXT_PUBLIC_APP_URL + "/api/sync";

export class SyncService {
  private static isSyncing = false;

  /**
   * Vérifie si nous sommes en mode local
   */
  static isLocal() {
    return typeof window !== "undefined" && 
           (window.location.hostname === "localhost" || window.location.hostname.includes("192.168."));
  }

  /**
   * Lance une synchronisation complète
   */
  static async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    console.log("🔄 Début de la synchronisation...");

    try {
      for (const model of SYNCABLE_MODELS) {
        await this.syncModel(model);
      }
      console.log("✅ Synchronisation terminée avec succès.");
    } catch (error) {
      console.error("❌ Erreur de synchronisation:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchronise un modèle spécifique
   */
  private static async syncModel(model: string) {
    // 1. PUSH : Envoyer les données locales non synchronisées
    const localRes = await fetch(`/api/sync?model=${model}&lastSync=1970-01-01`);
    const { data: localData } = await localRes.json();
    
    const unsynced = localData.filter((item: any) => !item.isSynced);

    if (unsynced.length > 0) {
      console.log(`[${model}] Pushing ${unsynced.length} items to cloud...`);
      await fetch(CLOUD_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, data: unsynced }),
      });

      // Marquer comme synchronisé localement
      await fetch(`/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          model, 
          data: unsynced.map((item: any) => ({ ...item, isSynced: true })) 
        }),
      });
    }

    // 2. PULL : Récupérer les nouveautés du cloud (Optionnel pour l'instant)
    // On pourrait ajouter un pull ici si nécessaire
  }
}
