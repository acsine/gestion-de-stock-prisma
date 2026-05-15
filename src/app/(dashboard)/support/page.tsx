// src/app/(dashboard)/support/page.tsx
"use client";

import { useState } from "react";
import { LifeBuoy, Send, MessageSquare, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { useTickets, useTicket, useCreateTicket, useSendMessage } from "@/hooks/useQueries";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function SupportPage() {
  const { data: ticketsData, isLoading: isLoadingList } = useTickets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: ticketDetail, isLoading: isLoadingDetail } = useTicket(selectedId || "");
  const { mutate: createTicket, isPending: isCreating } = useCreateTicket();
  const { mutate: sendMessage } = useSendMessage();

  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("NORMALE");
  const [chatMsg, setChatMsg] = useState("");

  const tickets = ticketsData?.data || [];
  const ticket = ticketDetail?.data;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTicket({ subject, message, priority }, {
      onSuccess: (res) => {
        setShowNew(false);
        setSubject("");
        setMessage("");
        setSelectedId(res.data.id);
      }
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim() || !selectedId) return;
    sendMessage({ ticketId: selectedId, content: chatMsg });
    setChatMsg("");
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-blue-600" />
          Aide & Support Technique
        </h1>
        <button 
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" /> Nouveau Ticket
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Ticket List */}
        <div className="w-80 bg-white rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Mes Demandes</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-sm font-bold">Aucun ticket ouvert</p>
              </div>
            ) : tickets.map((t: any) => (
              <div 
                key={t.id} 
                onClick={() => { setSelectedId(t.id); setShowNew(false); }}
                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all ${selectedId === t.id ? "border-l-4 border-l-blue-600 bg-blue-50/20" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{t.id.slice(-5)}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${t.status === 'OUVERT' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>{t.status}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 truncate">{t.subject}</h4>
                <p className="text-[11px] text-slate-400 font-medium">{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true, locale: fr })}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat / Form Area */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
          {showNew ? (
            <div className="p-8 flex-1 overflow-y-auto">
              <h2 className="text-xl font-black text-slate-800 mb-6">Ouvrir une nouvelle demande</h2>
              <form onSubmit={handleCreate} className="space-y-6 max-w-2xl">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sujet du problème</label>
                  <input 
                    type="text" 
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Problème avec l'imprimante thermique"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Priorité</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BASSE">Basse</option>
                    <option value="NORMALE">Normale</option>
                    <option value="HAUTE">Haute</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Description détaillée</label>
                  <textarea 
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez votre problème ici..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreating ? "Création..." : "Envoyer la demande"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowNew(false)}
                    className="px-8 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          ) : selectedId ? (
            isLoadingDetail ? (
              <div className="flex-1 flex items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin text-blue-600" /></div>
            ) : (
              <>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{ticket.subject}</h3>
                    <p className="text-[10px] text-blue-500 font-black uppercase">Ticket #{ticket.id.slice(-5)} • {ticket.priority}</p>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                  {ticket.messages?.map((m: any) => (
                    <div key={m.id} className={`flex gap-3 ${!m.isAdmin ? "justify-end" : ""}`}>
                      {m.isAdmin && <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">SUP</div>}
                      <div className={`${!m.isAdmin ? "bg-white text-slate-700 border border-slate-100 shadow-sm" : "bg-blue-600 text-white shadow-lg shadow-blue-500/20"} p-4 rounded-2xl ${!m.isAdmin ? "rounded-tr-none" : "rounded-tl-none"} max-w-[80%]`}>
                        <p className="text-sm leading-relaxed">{m.content}</p>
                        <span className={`text-[10px] ${!m.isAdmin ? "text-slate-400" : "text-blue-200"} font-medium mt-2 block text-right`}>
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      {!m.isAdmin && <div className="w-8 h-8 rounded-lg bg-slate-200 flex-shrink-0" />}
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-slate-100 bg-white">
                  <form onSubmit={handleSend} className="relative">
                    <input 
                      type="text" 
                      value={chatMsg}
                      onChange={(e) => setChatMsg(e.target.value)}
                      placeholder="Ajouter une réponse..." 
                      className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <LifeBuoy className="w-12 h-12 opacity-20" />
              </div>
              <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Centre de Support</h3>
              <p className="text-sm font-medium max-w-xs text-center mt-2">Sélectionnez un ticket existant ou créez-en un nouveau pour obtenir de l&apos;aide.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
