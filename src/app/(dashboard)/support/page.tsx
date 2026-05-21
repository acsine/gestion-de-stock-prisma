// src/app/(dashboard)/support/page.tsx
"use client";

import { useState } from "react";
import { LifeBuoy, Send, MessageSquare, Plus, RefreshCw, AlertCircle, X, Paperclip, Eye, ExternalLink } from "lucide-react";
import { useTickets, useTicket, useCreateTicket, useSendMessage } from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { formatDistanceToNow } from "date-fns";
import { fr as frLocale } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useTranslation } from "@/locales/i18n";

export default function SupportPage() {
  const { t, language } = useTranslation();
  const { addToast } = useUIStore();
  const { data: ticketsData, isLoading: isLoadingList } = useTickets();
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: ticketDetail, isLoading: isLoadingDetail } = useTicket(selectedId || "");
  const { mutate: createTicket, isPending: isCreating } = useCreateTicket();
  const { mutate: sendMessage } = useSendMessage();

  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("NORMALE");
  const [chatMsg, setChatMsg] = useState("");

  // Upload States
  const [uploadingFile, setUploadingFile] = useState(false);
  const [chatFileUrl, setChatFileUrl] = useState<string | null>(null);
  const [chatUploading, setChatUploading] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const tickets = ticketsData?.data || [];
  const ticket = ticketDetail?.data;

  const dateLocale = language === "fr" ? frLocale : enUS;

  const priorityOptions = [
    { value: "BASSE", label: language === "fr" ? "Basse" : "Low" },
    { value: "NORMALE", label: language === "fr" ? "Normale" : "Normal" },
    { value: "HAUTE", label: language === "fr" ? "Haute" : "High" },
    { value: "URGENTE", label: language === "fr" ? "Urgente" : "Urgent" },
  ];

  const handleSelectTicket = (id: string) => {
    setSelectedId(id);
    setShowNew(false);
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
      throw new Error("Erreur de chargement");
    }

    const data = await res.json();
    return data.url || null;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    createTicket({ subject, message, priority }, {
      onSuccess: (res) => {
        if (res.error) {
          addToast({ type: "error", title: t.common.error, message: res.error });
          return;
        }
        if (res.data?.id) {
          addToast({
            type: "success",
            title: language === "fr" ? "Ticket créé" : "Ticket created",
            message: language === "fr" ? "Votre demande a été envoyée." : "Your request has been sent.",
          });
          setShowNew(false);
          setSubject("");
          setMessage("");
          setSelectedId(res.data.id);
          setMobileView("detail");
        }
      },
      onError: (err: any) => {
        addToast({
          type: "error",
          title: t.common.error,
          message: language === "fr" ? "Erreur lors de la création du ticket" : "Error creating ticket",
        });
      }
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    let finalContent = chatMsg.trim();
    if (chatFileUrl) {
      finalContent += (finalContent ? "\n\n" : "") + `![Pièce Jointe](${chatFileUrl})`;
    }
    if (!finalContent || !selectedId) return;

    sendMessage({ ticketId: selectedId, content: finalContent });
    setChatMsg("");
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
          {language === "fr" ? "Support" : "Support"}
        </h1>
        <button 
          onClick={() => { setShowNew(true); setMobileView("detail"); }}
          className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white text-[10px] md:text-sm font-black uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" /> {language === "fr" ? "Nouveau" : "New"}
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden relative">
        {/* Ticket List */}
        <div className={cn(
          "w-full md:w-80 bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col shadow-sm transition-all duration-300",
          mobileView === "detail" ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{language === "fr" ? "Mes Demandes" : "My Requests"}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-sm font-bold">{language === "fr" ? "Aucun ticket ouvert" : "No open tickets"}</p>
              </div>
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
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                    tk.status === 'OUVERT' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                  )}>{tk.status}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 truncate">{tk.subject}</h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {formatDistanceToNow(new Date(tk.updatedAt), { addSuffix: true, locale: dateLocale })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat / Form Area */}
        <div className={cn(
          "flex-1 bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden relative transition-all duration-300",
          mobileView === "list" ? "hidden md:flex" : "flex"
        )}>
          {showNew ? (
            <div className="p-6 md:p-8 flex-1 overflow-y-auto">
              <div className="flex items-center gap-4 mb-6 md:hidden">
                <button type="button" onClick={() => setMobileView("list")} className="p-2 bg-slate-100 rounded-lg text-slate-500">
                  <X className="w-4 h-4" />
                </button>
                <h2 className="font-bold text-slate-800">{language === "fr" ? "Nouveau Ticket" : "New Ticket"}</h2>
              </div>
              <h2 className="hidden md:block text-xl font-black text-slate-800 mb-6">{language === "fr" ? "Ouvrir une nouvelle demande" : "Open a new request"}</h2>
              <form onSubmit={handleCreate} className="space-y-4 md:space-y-6 max-w-2xl">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t.support.modal.subject}</label>
                  <input 
                    type="text" 
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={language === "fr" ? "Ex: Problème d'impression..." : "E.g.: Printing issue..."}
                    className="w-full px-4 py-2 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{language === "fr" ? "Priorité" : "Priority"}</label>
                  <SearchableSelect
                    options={priorityOptions}
                    value={priority}
                    onChange={setPriority}
                    placeholder={language === "fr" ? "Priorité" : "Priority"}
                    className="w-full font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{language === "fr" ? "Description détaillée" : "Detailed description"}</label>
                  <textarea 
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={language === "fr" ? "Décrivez votre problème ici..." : "Describe your issue here..."}
                    className="w-full px-4 py-2 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{language === "fr" ? "Image ou document (Optionnel)" : "Image or document (Optional)"}</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl cursor-pointer text-xs font-bold text-slate-600 transition-all select-none">
                      <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingFile}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingFile(true);
                          try {
                            const url = await uploadFileToIK(file);
                            if (url) {
                              setMessage((prev) => prev + (prev ? "\n\n" : "") + `![Capture](${url})`);
                              addToast({
                                type: "success",
                                title: language === "fr" ? "Fichier attaché" : "File attached",
                                message: language === "fr" ? "Le justificatif a été inséré dans votre description." : "The attachment has been inserted into your description.",
                              });
                            }
                          } catch (err) {
                            addToast({
                              type: "error",
                              title: t.common.error,
                              message: language === "fr" ? "Impossible de charger l'image" : "Unable to load image",
                            });
                          } finally {
                            setUploadingFile(false);
                          }
                        }}
                      />
                      {uploadingFile ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>{language === "fr" ? "Chargement..." : "Uploading..."}</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-4 h-4 text-slate-500" />
                          <span>{language === "fr" ? "Sélectionner une capture / reçu" : "Select a screenshot / receipt"}</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 md:gap-4 pt-2">
                  <button 
                    type="submit"
                    disabled={isCreating || uploadingFile}
                    className="flex-1 py-3 md:py-4 bg-blue-600 text-white text-xs md:text-sm font-black uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreating
                      ? (language === "fr" ? "Création..." : "Creating...")
                      : (language === "fr" ? "Envoyer" : "Send")}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowNew(false); setMobileView("list"); }}
                    className="px-4 md:px-8 py-3 md:py-4 bg-slate-100 text-slate-600 text-xs md:text-sm font-black uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-slate-200"
                  >
                    {t.actions.cancel}
                  </button>
                </div>
              </form>
            </div>
          ) : selectedId ? (
            isLoadingDetail ? (
              <div className="flex-1 flex items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin text-blue-600" /></div>
            ) : (
              <>
                <div className="p-4 md:p-6 border-b border-slate-100 flex items-center gap-4">
                  <button onClick={() => setMobileView("list")} className="md:hidden p-2 bg-slate-100 rounded-lg text-slate-500">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{ticket.subject}</h3>
                    <p className="text-[10px] text-blue-500 font-black uppercase">#{ticket.id.slice(-5)} • {ticket.priority}</p>
                  </div>
                </div>

                <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 bg-slate-50/50">
                  {ticket.messages?.map((m: any) => (
                    <div key={m.id} className={cn("flex gap-2 md:gap-3", !m.isAdmin ? "justify-end" : "")}>
                      {m.isAdmin && <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[8px] md:text-[10px] font-black flex-shrink-0">SUP</div>}
                      <div className={cn(
                        "p-3 md:p-4 rounded-xl md:rounded-2xl max-w-[85%] md:max-w-[80%]",
                        !m.isAdmin ? "bg-white text-slate-700 border border-slate-100 shadow-sm rounded-tr-none" : "bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-tl-none"
                      )}>
                        {renderMessageContent(m.content, m.isAdmin)}
                        <span className={cn(
                          "text-[8px] md:text-[10px] font-medium mt-2 block text-right",
                          !m.isAdmin ? "text-slate-400" : "text-blue-200"
                        )}>
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: dateLocale })}
                        </span>
                      </div>
                      {!m.isAdmin && <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 text-[8px] md:text-[10px] font-black uppercase">{ticket.user?.name?.[0] || "M"}</div>}
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
                        <p className="text-[10px] text-slate-400 font-medium">{language === "fr" ? "Sera jointe à votre message" : "Will be attached to your message"}</p>
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
                            addToast({
                              type: "error",
                              title: t.common.error,
                              message: language === "fr" ? "Impossible de charger l'image" : "Unable to load image",
                            });
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
                        value={chatMsg}
                        onChange={(e) => setChatMsg(e.target.value)}
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
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <LifeBuoy className="w-8 h-8 md:w-12 md:h-12 opacity-20" />
              </div>
              <h3 className="text-sm md:text-lg font-black text-slate-400 uppercase tracking-widest text-center">{language === "fr" ? "Centre de Support" : "Support Center"}</h3>
              <p className="text-xs md:text-sm font-medium max-w-xs text-center mt-2">{language === "fr" ? "Sélectionnez une demande pour commencer ou créez-en une nouvelle." : "Select a request to begin or create a new one."}</p>
            </div>
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
