"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package,
  Phone,
  MapPin,
  ImageIcon,
  Eye,
  EyeOff,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";

// ─── Top 30 most-used dial codes ───────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+237", country: "CM", flag: "🇨🇲", label: "Cameroun" },
  { code: "+225", country: "CI", flag: "🇨🇮", label: "Côte d'Ivoire" },
  { code: "+221", country: "SN", flag: "🇸🇳", label: "Sénégal" },
  { code: "+242", country: "CG", flag: "🇨🇬", label: "Congo" },
  { code: "+243", country: "CD", flag: "🇨🇩", label: "RD Congo" },
  { code: "+241", country: "GA", flag: "🇬🇦", label: "Gabon" },
  { code: "+229", country: "BJ", flag: "🇧🇯", label: "Bénin" },
  { code: "+226", country: "BF", flag: "🇧🇫", label: "Burkina Faso" },
  { code: "+223", country: "ML", flag: "🇲🇱", label: "Mali" },
  { code: "+228", country: "TG", flag: "🇹🇬", label: "Togo" },
  { code: "+234", country: "NG", flag: "🇳🇬", label: "Nigeria" },
  { code: "+233", country: "GH", flag: "🇬🇭", label: "Ghana" },
  { code: "+212", country: "MA", flag: "🇲🇦", label: "Maroc" },
  { code: "+216", country: "TN", flag: "🇹🇳", label: "Tunisie" },
  { code: "+213", country: "DZ", flag: "🇩🇿", label: "Algérie" },
  { code: "+20",  country: "EG", flag: "🇪🇬", label: "Égypte" },
  { code: "+27",  country: "ZA", flag: "🇿🇦", label: "Afrique du Sud" },
  { code: "+33",  country: "FR", flag: "🇫🇷", label: "France" },
  { code: "+32",  country: "BE", flag: "🇧🇪", label: "Belgique" },
  { code: "+41",  country: "CH", flag: "🇨🇭", label: "Suisse" },
  { code: "+1",   country: "US", flag: "🇺🇸", label: "États-Unis" },
  { code: "+44",  country: "GB", flag: "🇬🇧", label: "Royaume-Uni" },
  { code: "+49",  country: "DE", flag: "🇩🇪", label: "Allemagne" },
  { code: "+34",  country: "ES", flag: "🇪🇸", label: "Espagne" },
  { code: "+39",  country: "IT", flag: "🇮🇹", label: "Italie" },
  { code: "+351", country: "PT", flag: "🇵🇹", label: "Portugal" },
  { code: "+55",  country: "BR", flag: "🇧🇷", label: "Brésil" },
  { code: "+86",  country: "CN", flag: "🇨🇳", label: "Chine" },
  { code: "+91",  country: "IN", flag: "🇮🇳", label: "Inde" },
  { code: "+971", country: "AE", flag: "🇦🇪", label: "Émirats Arabes" },
];

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Step 1 — Company fields
  const [companyName, setCompanyName] = useState("");
  const [dialCode, setDialCode] = useState("+237");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Step 2 — Admin fields
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // ─── Phone validation ───────────────────────────────────────────
  const validatePhone = (dial: string, num: string): boolean => {
    if (!num.trim()) { setPhoneError("Le numéro de téléphone est requis"); return false; }
    const full = `${dial}${num.replace(/\s/g, "")}`;
    const parsed = parsePhoneNumberFromString(full);
    if (!parsed || !parsed.isValid()) {
      setPhoneError("Numéro invalide pour ce code pays");
      return false;
    }
    setPhoneError("");
    return true;
  };

  // ─── Logo upload ────────────────────────────────────────────────
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadingLogo(true);
    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Upload
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur upload");
      setLogoUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  // ─── Step 1 → Step 2 ────────────────────────────────────────────
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validatePhone(dialCode, phoneNumber)) return;
    setStep(2);
  };

  // ─── Final submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fullPhone = `${dialCode}${phoneNumber.replace(/\s/g, "")}`;
    try {
      const res = await fetch("/api/tenants/register", {
        method: "POST",
        body: JSON.stringify({
          companyName,
          companyPhone: fullPhone,
          companyAddress,
          companyLogo: logoUrl || null,
          adminName,
          adminEmail,
          adminPassword,
        }),
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

  // ─── Success screen ──────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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
            Votre demande d'inscription pour <strong>{companyName}</strong> a été reçue. Un administrateur ThaborSolution validera votre compte sous 24h.
          </p>
          <Link href="/login" className="btn-primary w-full inline-block text-center">
            Retour à la connexion
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* ── Left Illustration ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-slate-900 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Image src="/image/3.png" alt="Business" fill className="object-cover" />
        </div>
        <div className="relative z-10 max-w-md w-full">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="inline-flex items-center gap-2 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Package className="text-white w-7 h-7" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white uppercase">
                ThaborSolution<span className="text-blue-500">Stock</span>
              </span>
            </div>
            <h2 className="text-5xl font-black text-white leading-tight mb-8">
              Propulsez votre entreprise vers le <span className="text-blue-500">succès numérique.</span>
            </h2>
            <div className="space-y-5">
              {["Gestion de stock centralisée", "Synchronisation multi-site", "Facturez en un clic", "Support technique 24/7"].map((text, i) => (
                <div key={i} className="flex items-center gap-4 text-white/80 font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Step indicator on left */}
          <div className="mt-12 flex gap-3 items-center">
            {[1, 2].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? "w-12 bg-blue-500" : s < step ? "w-6 bg-blue-500/60" : "w-6 bg-white/20"}`} />
            ))}
            <span className="text-white/40 text-xs font-bold ml-2">Étape {step}/2</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-900 to-transparent" />
      </div>

      {/* ── Right Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 overflow-y-auto">
        <div className="max-w-lg w-full">
          <AnimatePresence mode="wait">

            {/* ══ STEP 1: Company Info ══════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full mb-4">
                    Étape 1 sur 2
                  </div>
                  <h1 className="text-4xl font-black text-slate-900 mb-2">Votre Entreprise</h1>
                  <p className="text-slate-500 font-medium">Renseignez les informations de votre commerce.</p>
                </div>

                <form onSubmit={handleStep1} className="space-y-5">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nom de l'entreprise *</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="input-premium pl-12"
                        placeholder="Ex: Ma Boutique SARL"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone de l'entreprise *</label>
                    <div className="flex gap-2">
                      {/* Country code selector */}
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                          value={dialCode}
                          onChange={(e) => { setDialCode(e.target.value); setPhoneError(""); }}
                          className="appearance-none bg-white border border-slate-200 rounded-2xl pl-9 pr-4 h-[50px] text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer min-w-[130px]"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code + c.country} value={c.code}>
                              {c.flag} {c.code} {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Number */}
                      <div className="relative flex-1">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(""); }}
                          required
                          className="input-premium pl-12 w-full"
                          placeholder="699 123 456"
                        />
                      </div>
                    </div>
                    {phoneError && <p className="text-rose-500 text-xs font-bold ml-1">{phoneError}</p>}
                    <p className="text-slate-400 text-[10px] ml-1">
                      Ce numéro sera unique et vous permettra de vous connecter.
                    </p>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Adresse (optionnel)</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        className="input-premium pl-12"
                        placeholder="Rue, Quartier, Ville"
                      />
                    </div>
                  </div>

                  {/* Logo */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Logo de l'entreprise (optionnel)</label>
                    <label className="flex items-center gap-4 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-4 cursor-pointer transition-all group">
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                      {uploadingLogo ? (
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      ) : logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-700">
                          {logoPreview ? "Logo chargé ✓" : "Choisir un logo"}
                        </p>
                        <p className="text-xs text-slate-400">PNG, JPG · Max 2 MB</p>
                      </div>
                    </label>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    className="btn-primary w-full py-4 text-base mt-2 flex items-center justify-center gap-3"
                  >
                    Suivant : Compte Admin
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>

                <p className="mt-6 text-center text-slate-500 font-medium text-sm">
                  Déjà un compte ?{" "}
                  <Link href="/login" className="text-blue-600 font-bold hover:underline">
                    Se connecter
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ══ STEP 2: Admin Account ══════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full mb-4">
                    Étape 2 sur 2
                  </div>
                  <h1 className="text-4xl font-black text-slate-900 mb-2">Compte Admin</h1>
                  <p className="text-slate-500 font-medium">
                    Créez les identifiants de l'administrateur de <strong className="text-slate-800">{companyName}</strong>.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Admin Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nom complet de l'administrateur *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                        className="input-premium pl-12"
                        placeholder="Jean Dupont"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email professionnel *</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                        className="input-premium pl-12"
                        placeholder="contact@entreprise.com"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe *</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                        minLength={8}
                        className="input-premium pl-12 pr-12"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                        {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-slate-400 text-[10px] ml-1">Minimum 8 caractères</p>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl"
                    >
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setStep(1); setError(null); }}
                      className="flex items-center gap-2 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-2xl transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 btn-primary py-4 text-base flex items-center justify-center gap-3"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer mon compte"}
                      {!loading && <ArrowRight className="w-5 h-5" />}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
