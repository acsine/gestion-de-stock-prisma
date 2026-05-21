"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Boxes, Send, RefreshCw, ChevronLeft, MessageSquare, AlertCircle, 
  Clock, ShieldAlert, KeyRound, Sparkles, AlertTriangle 
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr as frLocale } from "date-fns/locale";
import { useTranslation } from "@/locales/i18n";

export default function PublicTicketChatPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useTranslation();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/support/public-tickets/${ticketId}`);
      if (!res.ok) {
        throw new Error(language === "fr" ? "Ticket introuvable" : "Ticket not found");
      }
      const data = await res.json();
      setTicket(data.data);
      setError("");
    } catch (err: any) {
      setError(err.message || (language === "fr" ? "Erreur de chargement" : "Error loading ticket"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  // Polling for updates every 5 seconds
  useEffect(() => {
    if (!ticketId) return;

    const timer = setInterval(() => {
      setIsPolling(true);
      fetchTicket(true).finally(() => setIsPolling(false));
    }, 5000);

    return () => clearInterval(timer);
  }, [ticketId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/support/public-tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim() }),
      });

      if (!res.ok) {
        throw new Error(language === "fr" ? "Impossible d'envoyer le message" : "Failed to send message");
      }

      const data = await res.json();
      
      // Update local state with new message instantly
      setTicket((prev: any) => ({
        ...prev,
        messages: [...(prev?.messages || []), data.data],
      }));
      setReply("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-4">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <p className="text-slate-500 font-bold animate-pulse text-sm">
          {language === "fr" ? "Chargement du salon de discussion sécurisé..." : "Loading secure chatroom..."}
        </p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">
          {language === "fr" ? "Une erreur est survenue" : "An Error Occurred"}
        </h2>
        <p className="text-slate-500 font-medium mb-6 text-center max-w-md">
          {error || (language === "fr" ? "Ce ticket n'existe pas ou a été archivé." : "This ticket does not exist or has been archived.")}
        </p>
        <Link href="/login" className="btn-primary px-6 py-3 flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          {language === "fr" ? "Retour à la connexion" : "Back to login"}
        </Link>
      </div>
    );
  }

  // Check if ticket contains the default password reset message to show a premium alert
  const hasResetMessage = ticket.messages?.some((m: any) => m.isAdmin && m.content.includes("12345678"));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Glow background blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 py-4 md:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-800"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">
              <Boxes className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm md:text-base font-black text-slate-800">
                  {language === "fr" ? "Support de Récupération" : "Recovery Support"}
                </h1>
                <span className="bg-red-50 text-red-500 font-bold border border-red-100 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest animate-pulse">
                  {language === "fr" ? "URGENT" : "URGENT"}
                </span>
                {isPolling && (
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" title="Synchronisation active" />
                )}
              </div>
              <p className="text-[10px] md:text-xs text-slate-400 font-medium">
                Ticket <span className="font-mono font-bold text-slate-600">{ticket.id}</span> • {ticket.user?.name} ({ticket.tenant?.name})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">
                {language === "fr" ? "Statut de la demande" : "Request Status"}
              </span>
              <span className="text-xs font-black text-blue-600 uppercase">
                {ticket.status}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100/50 rounded-xl px-3 py-1.5 text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              {language === "fr" ? "Assistance Directe" : "Direct Assistance"}
            </div>
          </div>
        </div>
      </header>

      {/* Main chat layout */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col overflow-hidden">
        {/* Urgent security info card */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/70 backdrop-blur border border-amber-200 rounded-2xl p-4 md:p-5 mb-6 flex gap-3.5"
        >
          <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
            <h3 className="font-bold text-slate-800 mb-0.5">
              {language === "fr" ? "Assistance de Récupération de Compte" : "Account Recovery Support"}
            </h3>
            <p>
              {language === "fr"
                ? "Ce salon de chat est public et accessible uniquement via cette URL unique. L'administrateur système va examiner votre demande et réinitialisera votre mot de passe à la valeur par défaut "
                : "This chat room is public and only accessible via this unique URL. The system administrator will review your request and reset your password to the default value "}
              <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono font-bold text-amber-800">12345678</code>.
              {language === "fr"
                ? " Une fois reçu, connectez-vous immédiatement avec ce nouveau mot de passe et vous serez invité à en configurer un nouveau hautement sécurisé."
                : " Once received, log in immediately with this new password and you will be prompted to configure a new highly secure one."}
            </p>
          </div>
        </motion.div>

        {/* Floating reset key alert when ready */}
        {hasResetMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400 rounded-2xl p-5 mb-6 text-white shadow-xl shadow-emerald-500/10 flex items-center justify-between gap-4"
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 flex-shrink-0 shadow-inner">
                <KeyRound className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {language === "fr" ? "Mot de passe réinitialisé !" : "Password Reset Successful!"}
                </h3>
                <p className="text-xs font-semibold text-white/90 leading-tight">
                  {language === "fr"
                    ? "L'administrateur a réinitialisé votre mot de passe. Connectez-vous avec le mot de passe par défaut ci-dessous."
                    : "The administrator has reset your password. Use the default password below to log in."}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Mot de passe temporaire :</span>
                  <code className="bg-white/20 border border-white/20 px-2 py-0.5 rounded font-mono font-black text-sm select-all">12345678</code>
                </div>
              </div>
            </div>
            <Link 
              href="/login" 
              className="px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex-shrink-0"
            >
              {language === "fr" ? "Se Connecter" : "Log In"}
            </Link>
          </motion.div>
        )}

        {/* Chat area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
          {/* Chat Messages */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 bg-slate-50/50">
            {ticket.messages && ticket.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-bold">{language === "fr" ? "Aucun message" : "No messages"}</p>
              </div>
            ) : (
              ticket.messages?.map((m: any) => {
                const isSystemAdmin = m.isAdmin;
                return (
                  <div key={m.id} className={`flex gap-3 ${isSystemAdmin ? "justify-start" : "justify-end"}`}>
                    
                    {/* Avatar Left (Admin) */}
                    {isSystemAdmin && (
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-black uppercase shadow-md shadow-blue-500/10">
                        ADM
                      </div>
                    )}

                    {/* Bubble Content */}
                    <div className={`p-4 rounded-2xl max-w-[85%] md:max-w-[75%] border transition-all ${
                      isSystemAdmin 
                        ? "bg-white text-slate-700 border-slate-100 shadow-sm rounded-tl-none" 
                        : "bg-blue-600 text-white border-transparent shadow-lg shadow-blue-500/10 rounded-tr-none"
                    }`}>
                      {/* Check if password reset key content */}
                      {isSystemAdmin && m.content.includes("12345678") ? (
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-bold text-slate-800 leading-relaxed">
                            {m.content}
                          </p>
                          <div className="bg-emerald-50 border border-emerald-200/50 rounded-xl p-3 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-emerald-800">M.D.P par défaut : <code className="font-mono font-black text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded select-all text-xs">12345678</code></span>
                            <span className="text-[9px] bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Pret</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {m.content}
                        </p>
                      )}

                      <span className={`text-[8px] md:text-[10px] font-medium mt-2 block text-right ${
                        isSystemAdmin ? "text-slate-400" : "text-blue-200"
                      }`}>
                        {formatDistanceToNow(new Date(m.createdAt), { 
                          addSuffix: true, 
                          locale: language === "fr" ? frLocale : undefined 
                        })}
                      </span>
                    </div>

                    {/* Avatar Right (User) */}
                    {!isSystemAdmin && (
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-500 flex-shrink-0 flex items-center justify-center text-xs font-black uppercase">
                        {ticket.user?.name?.[0] || "U"}
                      </div>
                    )}

                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={language === "fr" ? "Saisir votre message pour l'administrateur..." : "Type your message for the administrator..."}
                className="flex-1 px-4 py-3 md:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                disabled={sending}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!reply.trim() || sending}
                className="p-3 md:p-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
