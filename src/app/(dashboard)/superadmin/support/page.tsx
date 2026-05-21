// src/app/(dashboard)/superadmin/support/page.tsx
"use client";

import { useState } from "react";
import { LifeBuoy, MessageSquare, User, Send, CheckCircle2, RefreshCw, X, ChevronLeft, Paperclip, Eye, ExternalLink, KeyRound, Sparkles } from "lucide-react";
import { useTickets, useTicket, useSendMessage } from "@/hooks/useQueries";
import { formatDistanceToNow } from "date-fns";
import { fr as frLocale } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/useUIStore";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/locales/i18n";

export default function AdminSupportPage() {
  const { t, language } = useTranslation();
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const { data: ticketsData, isLoading: isLoadingList } = useTickets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: ticketDetail, isLoading: isLoadingDetail } = useTicket(selectedId || "");
  const { mutate: sendMessage } = useSendMessage();
  const [msg, setMsg] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Upload States
  const [chatFileUrl, setChatFileUrl] = useState<string | null>(null);
  const [chatUploading, setChatUploading] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const tickets = ticketsData?.data || [];
  const ticket = ticketDetail?.data;

  const handleSelectTicket = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  const uploadFileToIK = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(language === "fr" ? "Erreur de chargement" : "Upload error");
    }

    const data = await res.json();
    return data.url || null;
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    let finalContent = msg.trim();
    if (chatFileUrl) {
      finalContent += (finalContent ? "\n\n" : "") + `![Fichier](${chatFileUrl})`;
    }
    if (!finalContent || !selectedId) return;

    sendMessage({ ticketId: selectedId, content: finalContent });
    setMsg("");
    setChatFileUrl(null);
  };

  const renderMessageContent = (content: string, isAdminMessage: boolean) => {
    // Regex for markdown images: ![alt](url)
    const regex = /!\[(.*?)\]\((.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }
      parts.push({
        type: "image",
        alt: match[1],
        url: match[2]
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    if (parts.length === 0) {
      return <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>;
    }

    return (
      <div className="space-y-2 text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words">
        {parts.map((part: any, idx: number) => {
          if (typeof part === "string") {
            return <span key={idx}>{part}</span>;
          } else {
            return (
              <div 
                key={idx} 
                className="my-2 select-none group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900/5 max-w-xs cursor-zoom-in"
                onClick={() => setZoomImageUrl(part.url)}
              >
                <img
                  src={part.url}
                  alt={part.alt}
                  className="max-h-40 w-full object-cover transition-all duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-all text-white">
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                    <Eye className="w-3.5 h-3.5" /> {language === "fr" ? "Agrandir" : "Enlarge"}
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between px-2 md:px-0">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3">
          <LifeBuoy className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
          {language === "fr" ? "Support Marchands" : "Merchant Support"}
        </h1>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden relative">
        {/* Ticket List */}
        <div className={cn(
          "w-full md:w-80 bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col shadow-sm transition-all",
          mobileView === "detail" ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{language === "fr" ? "Tickets" : "Tickets"}</span>
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{tickets.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : tickets.map((tk: any) => (
              <div 
                key={tk.id} 
                onClick={() => handleSelectTicket(tk.id)}
                className={cn(
                  "p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all",
                  selectedId === tk.id ? "border-l-4 border-l-blue-600 bg-blue-50/20" : ""
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{tk.id.slice(-5)}</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase",
                    tk.priority === "URGENTE" ? "text-red-500" : "text-slate-400"
                  )}>{tk.priority}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 truncate">{tk.subject}</h4>
                <p className="text-[11px] text-slate-500 font-medium">{tk.user?.name} • {tk.tenant?.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all",
          mobileView === "list" ? "hidden md:flex" : "flex"
        )}>
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
              <MessageSquare className="w-12 h-12 md:w-16 md:h-16 mb-4 opacity-20" />
              <p className="font-bold text-sm md:text-base text-center">{language === "fr" ? "Sélectionnez un ticket pour voir la conversation" : "Select a ticket to view the conversation"}</p>
            </div>
          ) : isLoadingDetail ? (
            <div className="flex-1 flex items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin text-blue-600" /></div>
          ) : (
            <>
              <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <button onClick={() => setMobileView("list")} className="md:hidden p-2 bg-slate-100 rounded-lg">
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </button>
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs md:text-base">
                    {ticket.user?.name?.[0] || "U"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs md:text-sm font-bold text-slate-800 truncate">{ticket.user?.name}</h3>
                    <p className="text-[8px] md:text-[10px] text-green-500 font-black uppercase truncate">{ticket.tenant?.name}</p>
                  </div>
                </div>
                <div className="hidden lg:block">
                   <span className="text-xs font-bold text-slate-400 truncate max-w-[200px] block">{ticket.subject}</span>
                </div>
              </div>

              {ticket.subject.startsWith("Paiement Manuel — ") && ticket.status !== "RESOLU" && (
                <div className="bg-emerald-50 border-b border-emerald-100 p-4 px-6 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 mb-0.5">{language === "fr" ? "Demande de validation d'abonnement" : "Subscription validation request"}</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">
                        {language === "fr"
                          ? "Le client a chargé son justificatif de dépôt Orange Money. Cliquez ci-contre après vérification pour activer sa licence."
                          : "The client has uploaded their Orange Money deposit receipt. Click the button after verification to activate their license."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(language === "fr"
                        ? "Voulez-vous valider ce paiement et activer l'abonnement du client ?"
                        : "Do you want to validate this payment and activate the client's subscription?")) return;
                      try {
                        const res = await fetch("/api/superadmin/tenants/activate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ticketId: ticket.id }),
                        });
                        if (res.ok) {
                          addToast({ type: "success", title: language === "fr" ? "Paiement Validé" : "Payment Validated", message: language === "fr" ? "Abonnement activé et client débloqué !" : "Subscription activated and client unblocked!" });
                          qc.invalidateQueries({ queryKey: ["tickets"] });
                          window.location.reload();
                        } else {
                          const err = await res.json();
                          addToast({ type: "error", title: t.common.error, message: err.error || (language === "fr" ? "Une erreur est survenue" : "An error occurred") });
                        }
                      } catch (err) {
                        addToast({ type: "error", title: t.common.error, message: language === "fr" ? "Erreur réseau" : "Network error" });
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.02]"
                  >
                    {language === "fr" ? "Valider & Activer" : "Validate & Activate"}
                  </button>
                </div>
              )}

              {ticket.subject.startsWith("Mot de passe oublié - ") && ticket.status !== "RESOLU" && (
                <div className="bg-blue-50 border-b border-blue-100 p-4 px-6 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                      <KeyRound className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 mb-0.5">{language === "fr" ? "Demande de réinitialisation de mot de passe" : "Password reset request"}</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">
                        {language === "fr"
                          ? "L'utilisateur a perdu son mot de passe. Cliquez ci-contre pour réinitialiser son mot de passe à la valeur par défaut (12345678)."
                          : "The user lost their password. Click the button to reset their password to the default value (12345678)."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(language === "fr"
                        ? "Voulez-vous réinitialiser le mot de passe de cet utilisateur à '12345678' ?"
                        : "Do you want to reset this user's password to '12345678'?")) return;
                      try {
                        const res = await fetch("/api/superadmin/support/reset-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ticketId: ticket.id }),
                        });
                        if (res.ok) {
                          addToast({ type: "success", title: language === "fr" ? "Mot de passe réinitialisé" : "Password Reset", message: language === "fr" ? "Le mot de passe a été défini à '12345678' !" : "Password has been set to '12345678'!" });
                          qc.invalidateQueries({ queryKey: ["tickets"] });
                          window.location.reload();
                        } else {
                          const err = await res.json();
                          addToast({ type: "error", title: t.common.error, message: err.error || (language === "fr" ? "Une erreur est survenue" : "An error occurred") });
                        }
                      } catch (err) {
                        addToast({ type: "error", title: t.common.error, message: language === "fr" ? "Erreur réseau" : "Network error" });
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 hover:scale-[1.02]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {language === "fr" ? "Réinitialiser" : "Reset"}
                  </button>
                </div>
              )}

              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 bg-slate-50/50">
                {ticket.messages?.map((m: any) => (
                  <div key={m.id} className={cn("flex gap-2 md:gap-3", m.isAdmin ? "justify-end" : "")}>
                    {!m.isAdmin && <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 text-[8px] md:text-[10px] font-black uppercase">{ticket.user?.name?.[0] || "M"}</div>}
                    <div className={cn(
                      "p-3 md:p-4 rounded-xl md:rounded-2xl max-w-[85%] md:max-w-[80%]",
                      m.isAdmin ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 shadow-sm rounded-tl-none"
                    )}>
                      {renderMessageContent(m.content, m.isAdmin)}
                      <span className={cn(
                        "text-[8px] md:text-[10px] font-medium mt-2 block text-right",
                        m.isAdmin ? "text-blue-200" : "text-slate-400"
                      )}>
                        {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: language === "fr" ? frLocale : enUS })}
                      </span>
                    </div>
                    {m.isAdmin && <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-blue-700 flex-shrink-0 flex items-center justify-center text-white text-[8px] md:text-[10px] font-black uppercase">SUP</div>}
                  </div>
                ))}
              </div>

              {/* Live attachment preparation preview */}
              {(chatFileUrl || chatUploading) && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-3">
                    {chatUploading ? (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="relative w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-slate-900 shadow-sm">
                        <img src={chatFileUrl!} alt={language === "fr" ? "Pièce jointe" : "Attachment"} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-700">
                        {chatUploading
                          ? (language === "fr" ? "Chargement du fichier..." : "Uploading file...")
                          : (language === "fr" ? "Image prête à être envoyée" : "Image ready to send")}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium">{language === "fr" ? "Sera jointe à votre réponse" : "Will be attached to your reply"}</p>
                    </div>
                  </div>
                  {!chatUploading && (
                    <button 
                      type="button" 
                      onClick={() => setChatFileUrl(null)} 
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              <div className="p-3 md:p-4 border-t border-slate-100 bg-white">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <label className={cn(
                    "p-2.5 md:p-3.5 border border-slate-200 rounded-xl md:rounded-2xl cursor-pointer transition-all flex items-center justify-center flex-shrink-0",
                    chatUploading ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      disabled={chatUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setChatUploading(true);
                        try {
                          const url = await uploadFileToIK(file);
                          if (url) {
                            setChatFileUrl(url);
                          }
                        } catch (err) {
                          addToast({ type: "error", title: t.common.error, message: language === "fr" ? "Impossible de charger l'image" : "Unable to upload the image" });
                        } finally {
                          setChatUploading(false);
                        }
                      }}
                    />
                    <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                  </label>

                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={msg}
                      onChange={(e) => setMsg(e.target.value)}
                      placeholder={language === "fr" ? "Répondre..." : "Reply..."} 
                      className="w-full pl-4 pr-12 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button 
                      type="submit" 
                      disabled={chatUploading}
                      className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg md:rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lightbox / Zoom Overlay */}
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
            <img src={zoomImageUrl} alt={language === "fr" ? "Reçu Agrandissement" : "Receipt Enlarged"} className="max-w-full max-h-[75vh] object-contain rounded-xl border border-white/10 bg-slate-950" />
            <div className="mt-4 flex justify-center gap-4">
              <a 
                href={zoomImageUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                {language === "fr" ? "Ouvrir en plein écran" : "Open fullscreen"} <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
