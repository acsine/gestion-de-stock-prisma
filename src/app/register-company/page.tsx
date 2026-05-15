"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Package
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function RegisterCompanyPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/tenants/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Une erreur est survenue");

      setSuccess(true);
      setTimeout(() => router.push("/login"), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl text-center border border-emerald-100"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4">Demande Envoyée !</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Votre demande d'inscription a été reçue. Un administrateur ThaborSolution validera votre compte sous 24h. Vous recevrez un email de confirmation.
          </p>
          <Link href="/login" className="btn-primary w-full inline-block">
            Retour à la connexion
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Side: Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <Image 
            src="/image/3.png" 
            alt="Business Partnership" 
            fill 
            className="object-cover"
          />
        </div>
        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Package className="text-white w-7 h-7" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white uppercase">ThaborSolution<span className="text-blue-500">Stock</span></span>
            </div>
            <h2 className="text-5xl font-black text-white leading-tight mb-8">
              Propulsez votre entreprise vers le <span className="text-blue-500">succès numérique.</span>
            </h2>
            <div className="space-y-6">
              {[
                "Gestion de stock centralisée",
                "Synchronisation multi-site",
                "Outils de facturation pro",
                "Support technique 24/7"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-4 text-white/80 font-semibold">
                  <CheckCircle2 className="w-6 h-6 text-blue-500" />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-900 to-transparent"></div>
      </div>

      {/* Right Side: Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-24 bg-mesh">
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full"
        >
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 mb-2">Inscription</h1>
            <p className="text-slate-500 font-medium">Créez votre espace entreprise en quelques secondes.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nom de l'entreprise</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  name="companyName" 
                  required 
                  className="input-premium pl-12" 
                  placeholder="Ex: Ma Boutique SARL"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nom complet (Admin)</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    name="adminName" 
                    required 
                    className="input-premium pl-12" 
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  name="adminEmail" 
                  required 
                  className="input-premium pl-12" 
                  placeholder="contact@entreprise.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  name="adminPassword" 
                  required 
                  className="input-premium pl-12" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl"
              >
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-4 text-lg mt-4 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Créer mon compte"}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 font-medium">
            Déjà un compte ? <Link href="/login" className="text-blue-600 font-bold hover:underline">Se connecter</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
