"use client";

import { useState } from "react";
import { LifeBuoy, MessageSquare, User, Send, CheckCircle2, RefreshCw } from "lucide-react";
import { useTickets, useTicket, useSendMessage } from "@/hooks/useQueries";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminSupportPage() {
  const { data: ticketsData, isLoading: isLoadingList } = useTickets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: ticketDetail, isLoading: isLoadingDetail } = useTicket(selectedId || "");
  const { mutate: sendMessage } = useSendMessage();
  const [msg, setMsg] = useState("");

  const tickets = ticketsData?.data || [];
  const ticket = ticketDetail?.data;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim() || !selectedId) return;
    sendMessage({ ticketId: selectedId, content: msg });
    setMsg("");
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-blue-600" />
          Support & Assistance Marchands
        </h1>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Ticket List */}
        <div className="w-80 bg-white rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tickets</span>
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{tickets.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : tickets.map((t: any) => (
              <div 
                key={t.id} 
                onClick={() => setSelectedId(t.id)}
                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all ${selectedId === t.id ? "border-l-4 border-l-blue-600 bg-blue-50/20" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{t.id.slice(-5)}</span>
                  <span className={`text-[10px] font-black uppercase ${t.priority === "URGENTE" ? "text-red-500" : "text-slate-400"}`}>{t.priority}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 truncate">{t.subject}</h4>
                <p className="text-[11px] text-slate-500 font-medium">{t.user?.name} • {t.tenant?.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold">Sélectionnez un ticket pour voir la conversation</p>
            </div>
          ) : isLoadingDetail ? (
            <div className="flex-1 flex items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin text-blue-600" /></div>
          ) : (
            <>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">
                    {ticket.user?.name?.[0] || "U"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{ticket.user?.name}</h3>
                    <p className="text-[10px] text-green-500 font-black uppercase">OUVERT • {ticket.tenant?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-slate-400">{ticket.subject}</span>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                {ticket.messages?.map((m: any) => (
                  <div key={m.id} className={`flex gap-3 ${m.isAdmin ? "justify-end" : ""}`}>
                    {!m.isAdmin && <div className="w-8 h-8 rounded-lg bg-slate-200 flex-shrink-0" />}
                    <div className={`${m.isAdmin ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white text-slate-700 border border-slate-100 shadow-sm"} p-4 rounded-2xl ${m.isAdmin ? "rounded-tr-none" : "rounded-tl-none"} max-w-[80%]`}>
                      <p className="text-sm leading-relaxed">{m.content}</p>
                      <span className={`text-[10px] ${m.isAdmin ? "text-blue-200" : "text-slate-400"} font-medium mt-2 block text-right`}>
                        {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    {m.isAdmin && <div className="w-8 h-8 rounded-lg bg-blue-700 flex-shrink-0" />}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white">
                <form onSubmit={handleSend} className="relative">
                  <input 
                    type="text" 
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Écrivez votre réponse..." 
                    className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
