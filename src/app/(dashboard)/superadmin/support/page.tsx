"use client";

import { useState } from "react";
import { LifeBuoy, MessageSquare, User, Send, CheckCircle2, RefreshCw, X, ChevronLeft } from "lucide-react";
import { useTickets, useTicket, useSendMessage } from "@/hooks/useQueries";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AdminSupportPage() {
  const { data: ticketsData, isLoading: isLoadingList } = useTickets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: ticketDetail, isLoading: isLoadingDetail } = useTicket(selectedId || "");
  const { mutate: sendMessage } = useSendMessage();
  const [msg, setMsg] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const tickets = ticketsData?.data || [];
  const ticket = ticketDetail?.data;

  const handleSelectTicket = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim() || !selectedId) return;
    sendMessage({ ticketId: selectedId, content: msg });
    setMsg("");
  };

  return (
    <div className="space-y-4 md:space-y-6 h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between px-2 md:px-0">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3">
          <LifeBuoy className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
          Support Marchands
        </h1>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden relative">
        {/* Ticket List */}
        <div className={cn(
          "w-full md:w-80 bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col shadow-sm transition-all",
          mobileView === "detail" ? "hidden md:flex" : "flex"
        )}>
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
                onClick={() => handleSelectTicket(t.id)}
                className={cn(
                  "p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all",
                  selectedId === t.id ? "border-l-4 border-l-blue-600 bg-blue-50/20" : ""
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{t.id.slice(-5)}</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase",
                    t.priority === "URGENTE" ? "text-red-500" : "text-slate-400"
                  )}>{t.priority}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 truncate">{t.subject}</h4>
                <p className="text-[11px] text-slate-500 font-medium">{t.user?.name} • {t.tenant?.name}</p>
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
              <p className="font-bold text-sm md:text-base text-center">Sélectionnez un ticket pour voir la conversation</p>
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

              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 bg-slate-50/50">
                {ticket.messages?.map((m: any) => (
                  <div key={m.id} className={cn("flex gap-2 md:gap-3", m.isAdmin ? "justify-end" : "")}>
                    {!m.isAdmin && <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-slate-200 flex-shrink-0" />}
                    <div className={cn(
                      "p-3 md:p-4 rounded-xl md:rounded-2xl max-w-[85%] md:max-w-[80%]",
                      m.isAdmin ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 shadow-sm rounded-tl-none"
                    )}>
                      <p className="text-xs md:text-sm leading-relaxed">{m.content}</p>
                      <span className={cn(
                        "text-[8px] md:text-[10px] font-medium mt-2 block text-right",
                        m.isAdmin ? "text-blue-200" : "text-slate-400"
                      )}>
                        {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    {m.isAdmin && <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-blue-700 flex-shrink-0" />}
                  </div>
                ))}
              </div>

              <div className="p-3 md:p-4 border-t border-slate-100 bg-white">
                <form onSubmit={handleSend} className="relative">
                  <input 
                    type="text" 
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Répondre..." 
                    className="w-full pl-4 pr-12 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button type="submit" className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg md:rounded-xl hover:bg-blue-700 transition-all">
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
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
