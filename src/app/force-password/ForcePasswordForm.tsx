"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, LogOut } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import { useTranslation } from "@/locales/i18n";

export function ForcePasswordForm() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { addToast } = useUIStore();
  const { language } = useTranslation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 8) {
      setError(
        language === "fr"
          ? "Le mot de passe doit faire au moins 8 caractères."
          : "Password must be at least 8 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        language === "fr"
          ? "Les deux mots de passe ne correspondent pas."
          : "Passwords do not match."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || (language === "fr" ? "Une erreur est survenue." : "An error occurred."));
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      addToast({
        type: "success",
        title: language === "fr" ? "Mot de passe modifié" : "Password updated",
        message: language === "fr" ? "Votre mot de passe a été modifié avec succès." : "Your password was successfully updated.",
      });

      // Update client-side next-auth session to reflect the updated state
      await updateSession({ mustChangePassword: false });

      // Immediate redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(language === "fr" ? "Erreur réseau." : "Network error.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="relative bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Neon line overlay */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500 opacity-60" />

          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">
              {language === "fr" ? "Modification Obligatoire" : "Password Change Required"}
            </h1>
            <p className="text-slate-400 text-sm font-medium leading-relaxed px-4">
              {language === "fr"
                ? "Il s'agit de votre première connexion. Veuillez définir un nouveau mot de passe sécurisé."
                : "This is your first login. Please set a new secure password."}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-bold rounded-xl flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-4"
            >
              <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-white font-bold">
                  {language === "fr" ? "Mot de passe enregistré !" : "Password Saved!"}
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {language === "fr"
                    ? "Redirection vers votre tableau de bord en cours..."
                    : "Redirecting to your dashboard..."}
                </p>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  {language === "fr" ? "Nouveau mot de passe" : "New Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-[50px] bg-white/5 border border-white/10 rounded-2xl pl-4 pr-12 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  {language === "fr" ? "Confirmer le mot de passe" : "Confirm Password"}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-[50px] bg-white/5 border border-white/10 rounded-2xl pl-4 pr-12 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[50px] bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    language === "fr" ? "Enregistrer" : "Save Changes"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full h-[50px] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  {language === "fr" ? "Se déconnecter" : "Sign Out"}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
