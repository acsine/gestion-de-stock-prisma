"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ShieldAlert, Send, LogOut, Loader2, CheckCircle2 } from "lucide-react";

export default function BlockedPage() {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `Demande de déblocage — ${session?.user?.name || "Utilisateur"}`,
          message: message,
          priority: "URGENTE",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue");

      setSuccess(true);
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Impossible d'envoyer le message de support");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative gradient glowing circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full filter blur-[100px] animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-[100px] animate-pulse duration-[10000ms]" />

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] border border-slate-800 p-8 md:p-10 shadow-2xl relative z-10 text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-bounce duration-[3000ms]">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Accès Restreint</h1>
        <p className="text-slate-400 font-medium mb-6 text-sm">
          Votre compte utilisateur (<strong>{session?.user?.email}</strong>) a été temporairement désactivé par un administrateur. Vous n'avez plus accès au tableau de bord.
        </p>

        {success ? (
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-6 text-center animate-in fade-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="font-bold text-white text-lg mb-1">Message envoyé !</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Votre demande a bien été transmise à notre support technique. Nous reviendrons vers vous dans les plus brefs délais par email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contacter le support</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="Expliquez votre situation ou laissez un message à l'administrateur..."
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none transition-all"
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="btn-primary w-full py-4 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Envoyer la demande</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center justify-center">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
