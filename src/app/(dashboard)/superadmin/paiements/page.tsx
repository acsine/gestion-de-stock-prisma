// src/app/(dashboard)/superadmin/paiements/page.tsx
"use client";

import { useState } from "react";
import { CreditCard, CheckCircle, ExternalLink, Filter, RefreshCw, X, Eye, ShieldAlert, Sparkles } from "lucide-react";
import { useTickets } from "@/hooks/useQueries";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/useUIStore";

export default function AdminPaymentsPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const { data: ticketsData, isLoading, isRefetching } = useTickets();
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OUVERT" | "RESOLU">("ALL");
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [isValidatingId, setIsValidatingId] = useState<string | null>(null);

  const tickets = ticketsData?.data || [];
  
  // Filter tickets for manual payments: starts with "Paiement Manuel — "
  const paymentTickets = tickets.filter((t: any) => 
    t.subject.toLowerCase().startsWith("paiement manuel — ")
  );

  const filteredTickets = paymentTickets.filter((t: any) => {
    if (filterStatus === "ALL") return true;
    return t.status === filterStatus;
  });

  const extractReceiptUrl = (content: string) => {
    const match = content.match(/!\[.*?\]\((.*?)\)/);
    return match ? match[1] : null;
  };

  const handleValidate = async (ticketId: string) => {
    if (!confirm("Voulez-vous valider ce paiement et activer l'abonnement du client ?")) return;
    setIsValidatingId(ticketId);
    try {
      const res = await fetch("/api/superadmin/tenants/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      const data = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Paiement validé !",
          message: data.message || "L'abonnement a été activé avec succès.",
        });
        qc.invalidateQueries({ queryKey: ["tickets"] });
      } else {
        addToast({
          type: "error",
          title: "Erreur de validation",
          message: data.error || "Une erreur est survenue lors de l'activation.",
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Erreur réseau",
        message: "Impossible de joindre le serveur de validation.",
      });
    } finally {
      setIsValidatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-blue-600 animate-pulse" />
          Validation des Paiements Manuels
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                filterStatus === "ALL" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tous ({paymentTickets.length})
            </button>
            <button
              onClick={() => setFilterStatus("OUVERT")}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                filterStatus === "OUVERT" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              En attente ({paymentTickets.filter((t: any) => t.status === "OUVERT").length})
            </button>
            <button
              onClick={() => setFilterStatus("RESOLU")}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                filterStatus === "RESOLU" ? "bg-white text-slate-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Validés ({paymentTickets.filter((t: any) => t.status === "RESOLU").length})
            </button>
          </div>
          <button 
            onClick={() => qc.invalidateQueries({ queryKey: ["tickets"] })}
            className="p-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-600 transition-all flex items-center justify-center"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${(isLoading || isRefetching) ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-sm font-bold">Chargement des demandes de paiement...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 opacity-20 text-blue-600" />
            </div>
            <p className="text-sm font-bold">Aucune demande de paiement trouvée dans cette catégorie.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client & Date</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entreprise</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Formule demandée</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Justificatif</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t: any) => {
                  const firstMsg = t.messages?.[0]?.content || "";
                  const receiptUrl = extractReceiptUrl(firstMsg);
                  // Extract formula name from Subject (Paiement Manuel — FORMULE)
                  const formula = t.subject.replace(/Paiement Manuel — /i, "").trim() || "PROFESSIONNEL";

                  return (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{t.user?.name}</div>
                        <div className="text-xs text-slate-400 font-medium">{t.user?.email}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-1">
                          Créé {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true, locale: fr })}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-black text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-100/50 px-2.5 py-1 rounded-lg">
                          {t.tenant?.name || "N/A"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            formula === "ENTREPRISE" 
                              ? "bg-purple-50 text-purple-600 border-purple-100" 
                              : formula === "PROFESSIONNEL"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : "bg-slate-50 text-slate-600 border-slate-100"
                          }`}>
                            {formula}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {receiptUrl ? (
                          <div className="relative group w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-900 shadow-sm cursor-pointer select-none" onClick={() => setZoomImageUrl(receiptUrl)}>
                            <img src={receiptUrl} alt="Reçu" className="w-full h-full object-cover group-hover:opacity-75 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-all text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Aucun reçu trouvé</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                          t.status === "RESOLU" 
                            ? "bg-slate-50 text-slate-500 border-slate-200" 
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}>
                          {t.status === "RESOLU" ? "VALIDÉ" : "EN ATTENTE"}
                        </span>
                      </td>
                      <td className="p-4">
                        {t.status !== "RESOLU" ? (
                          <button
                            onClick={() => handleValidate(t.id)}
                            disabled={isValidatingId === t.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.02] disabled:opacity-50"
                          >
                            {isValidatingId === t.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            Valider
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-slate-300" /> Prêt
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-3 bg-blue-100/60 rounded-xl text-blue-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-black text-blue-900 uppercase tracking-wide">Validation des Dépôts Manuels</h4>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed font-medium">
            Cette interface extrait directement les justificatifs de dépôt Orange Money / Mobile Money déposés par les utilisateurs depuis la page de blocage. 
            Vérifiez l'exactitude de la capture reçue en cliquant sur la miniature, puis cliquez sur <strong>Valider</strong>. 
            L'utilisateur sera automatiquement débloqué et sa licence activée.
          </p>
        </div>
      </div>

      {/* Lightbox / Zoom Image Viewer */}
      {zoomImageUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setZoomImageUrl(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
            onClick={() => setZoomImageUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-4xl max-h-[85vh] relative overflow-hidden rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={zoomImageUrl} alt="Reçu Agrandissement" className="max-w-full max-h-[75vh] object-contain rounded-xl border border-white/10 bg-slate-950" />
            <div className="mt-4 flex justify-center gap-4">
              <a 
                href={zoomImageUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                Ouvrir en plein écran <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
