"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Boxes, Mail, ArrowRight, Loader2, MessageSquare, CheckCircle, AlertCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/locales/i18n";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { language } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(language === "fr" ? "Veuillez saisir votre adresse email" : "Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (language === "fr" ? "Une erreur est survenue" : "An error occurred"));
      } else {
        setTicketId(data.ticketId);
      }
    } catch (err) {
      setError(language === "fr" ? "Impossible de contacter le serveur" : "Unable to reach server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg bg-white/70 backdrop-blur-xl border border-white border-slate-200 rounded-[2rem] p-8 md:p-12 shadow-2xl relative z-10"
      >
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Boxes className="text-white w-6 h-6" />
          </div>
          <span className="text-base font-black tracking-widest text-slate-800 uppercase">ThaborSolution Stock</span>
        </div>

        <AnimatePresence mode="wait">
          {!ticketId ? (
            <motion.div
              key="forgot-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-black text-slate-900 mb-3">
                  {language === "fr" ? "Mot de passe oublié ?" : "Forgot Password?"}
                </h1>
                <p className="text-slate-500 font-medium text-sm md:text-base px-2">
                  {language === "fr"
                    ? "Saisissez votre adresse email et nous créerons un ticket de support prioritaire pour réinitialiser votre mot de passe."
                    : "Enter your email address and we'll create a high-priority support ticket to reset your password."}
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs md:text-sm font-bold rounded-2xl flex items-start gap-2"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    {language === "fr" ? "Adresse email" : "Email Address"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="input-premium pl-12 w-full bg-white"
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-4 text-base font-black uppercase tracking-wider flex items-center justify-center gap-3 relative overflow-hidden group shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {language === "fr" ? "Créer un Ticket de Support" : "Create Support Ticket"}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {language === "fr" ? "Retour à la page de connexion" : "Back to login"}
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-emerald-500/5">
                <CheckCircle className="w-10 h-10 animate-bounce" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                  {language === "fr" ? "Ticket créé avec succès !" : "Ticket Created Successfully!"}
                </h2>
                <p className="text-slate-500 font-medium text-sm">
                  {language === "fr"
                    ? "Un ticket de support prioritaire a été ouvert pour votre demande."
                    : "A high-priority support ticket has been opened for your request."}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">
                    {language === "fr" ? "ID TICKET" : "TICKET ID"}
                  </span>
                  <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {ticketId.slice(-8).toUpperCase()}
                  </span>
                </div>
                <hr className="border-slate-100" />
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">EMAIL</span>
                  <span className="font-bold text-slate-700">{email}</span>
                </div>
                <hr className="border-slate-100" />
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">PRIORITÉ</span>
                  <span className="font-bold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full uppercase tracking-widest text-[9px] animate-pulse border border-red-200/50">
                    {language === "fr" ? "URGENTE" : "URGENT"}
                  </span>
                </div>
              </div>

              <div className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4">
                {language === "fr"
                  ? "Vous allez maintenant être redirigé vers le salon de discussion public sécurisé. Un administrateur va réinitialiser votre mot de passe et vous l'envoyer directement dans ce chat."
                  : "You will now be redirected to the secure public discussion room. An administrator will reset your password and send it to you directly in this chat."}
              </div>

              <button
                onClick={() => router.push(`/tickets/public/${ticketId}`)}
                className="btn-primary w-full py-4 text-base font-black uppercase tracking-wider flex items-center justify-center gap-3 relative overflow-hidden group shadow-lg shadow-blue-500/20"
              >
                <MessageSquare className="w-5 h-5" />
                {language === "fr" ? "Accéder au Chat de Support" : "Access Support Chat"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
