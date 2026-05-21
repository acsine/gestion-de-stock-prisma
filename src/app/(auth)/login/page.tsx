"use client";
// src/app/(auth)/login/page.tsx
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useTranslation } from "@/locales/i18n";

// Country codes list (same as registration)
const COUNTRY_CODES = [
  { code: "+237", flag: "🇨🇲", label: "Cameroun" },
  { code: "+225", flag: "🇨🇮", label: "Côte d'Ivoire" },
  { code: "+221", flag: "🇸🇳", label: "Sénégal" },
  { code: "+242", flag: "🇨🇬", label: "Congo" },
  { code: "+243", flag: "🇨🇩", label: "RD Congo" },
  { code: "+241", flag: "🇬🇦", label: "Gabon" },
  { code: "+229", flag: "🇧🇯", label: "Bénin" },
  { code: "+226", flag: "🇧🇫", label: "Burkina Faso" },
  { code: "+223", flag: "🇲🇱", label: "Mali" },
  { code: "+228", flag: "🇹🇬", label: "Togo" },
  { code: "+234", flag: "🇳🇬", label: "Nigeria" },
  { code: "+233", flag: "🇬🇭", label: "Ghana" },
  { code: "+212", flag: "🇲🇦", label: "Maroc" },
  { code: "+216", flag: "🇹🇳", label: "Tunisie" },
  { code: "+213", flag: "🇩🇿", label: "Algérie" },
  { code: "+20",  flag: "🇪🇬", label: "Égypte" },
  { code: "+27",  flag: "🇿🇦", label: "Afrique du Sud" },
  { code: "+33",  flag: "🇫🇷", label: "France" },
  { code: "+32",  flag: "🇧🇪", label: "Belgique" },
  { code: "+41",  flag: "🇨🇭", label: "Suisse" },
  { code: "+1",   flag: "🇺🇸", label: "États-Unis" },
  { code: "+44",  flag: "🇬🇧", label: "Royaume-Uni" },
  { code: "+49",  flag: "🇩🇪", label: "Allemagne" },
  { code: "+34",  flag: "🇪🇸", label: "Espagne" },
  { code: "+39",  flag: "🇮🇹", label: "Italie" },
  { code: "+351", flag: "🇵🇹", label: "Portugal" },
  { code: "+55",  flag: "🇧🇷", label: "Brésil" },
  { code: "+86",  flag: "🇨🇳", label: "Chine" },
  { code: "+91",  flag: "🇮🇳", label: "Inde" },
  { code: "+971", flag: "🇦🇪", label: "Émirats Arabes" },
];

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle: "email" or "phone"
  const [loginType, setLoginType] = useState<"email" | "phone">("email");

  // Email login
  const [email, setEmail] = useState("");

  // Phone login
  const [dialCode, setDialCode] = useState("+237");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneInputError, setPhoneInputError] = useState("");
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);

  // Real-time phone validation
  const handlePhoneInput = (dial: string, num: string) => {
    setPhoneNumber(num);
    setPhoneInputError("");
    if (!num.trim()) { setPhoneValid(null); return; }
    const full = `${dial}${num.replace(/\s/g, "")}`;
    const parsed = parsePhoneNumberFromString(full);
    if (parsed && parsed.isValid()) {
      setPhoneValid(true);
    } else {
      setPhoneValid(false);
      setPhoneInputError(t.login.invalidPhone);
    }
  };

  // Re-validate on country code change
  const handleDialChange = (newDial: string) => {
    setDialCode(newDial);
    setPhoneInputError("");
    if (!phoneNumber.trim()) { setPhoneValid(null); return; }
    const full = `${newDial}${phoneNumber.replace(/\s/g, "")}`;
    const parsed = parsePhoneNumberFromString(full);
    if (parsed && parsed.isValid()) {
      setPhoneValid(true);
    } else {
      setPhoneValid(false);
      setPhoneInputError(t.login.invalidPhone);
    }
  };

  // Password
  const [password, setPassword] = useState("");

  // Background feature carousel
  const features = [
    { title: t.login.feat1Title, desc: t.login.feat1Desc },
    { title: t.login.feat2Title, desc: t.login.feat2Desc },
    { title: t.login.feat3Title, desc: t.login.feat3Desc },
  ];
  const [featureIdx, setFeatureIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIdx((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [features.length]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPhoneInputError("");

    let loginValue = "";

    if (loginType === "email") {
      if (!email.trim()) { setError(t.login.errorEmail); return; }
      loginValue = email.trim().toLowerCase();
    } else {
      if (!phoneNumber.trim()) { setPhoneInputError(t.login.errorPhone); return; }
      const full = `${dialCode}${phoneNumber.replace(/\s/g, "")}`;
      const parsed = parsePhoneNumberFromString(full);
      if (!parsed || !parsed.isValid()) {
        setPhoneInputError(t.login.invalidPhone);
        return;
      }
      loginValue = parsed.format("E.164");
    }

    setIsSubmitting(true);
    const result = await signIn("credentials", {
      login: loginValue,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(
        loginType === "email"
          ? t.login.invalidCredentialsEmail
          : t.login.invalidCredentialsPhone
      );
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* ── Left Side: Illustration ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 relative items-center justify-center p-16 overflow-hidden">
        <motion.div
          key={featureIdx}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute inset-0"
        >
          <Image
            src={featureIdx === 0 ? "/image/2.png" : featureIdx === 1 ? "/image/1.png" : "/image/3.png"}
            alt="Management Illustration"
            fill
            className="object-cover"
          />
        </motion.div>

        <div className="relative z-10 w-full max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-8">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Boxes className="text-white w-5 h-5" />
              </div>
              <span className="text-sm font-black tracking-widest text-white uppercase">ThaborSolution Stock</span>
            </div>

            <div className="h-40">
              <motion.div
                key={featureIdx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <h2 className="text-6xl font-black text-white leading-tight">
                  {features[featureIdx]?.title?.split(" ").map((word, i, arr) => (
                    <span key={i} className={i === arr.length - 1 ? "text-blue-500" : ""}>
                      {word}{" "}
                    </span>
                  ))}
                </h2>
                <p className="text-2xl text-white/60 font-medium leading-relaxed">
                  {features[featureIdx]?.desc}
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Dots */}
          <div className="flex gap-2">
            {features.map((_, i) => (
              <div
                key={i}
                className={cn("h-1.5 transition-all duration-500 rounded-full", i === featureIdx ? "w-10 bg-blue-500" : "w-2 bg-white/20")}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
      </div>

      {/* ── Right Side: Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-24">
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="max-w-md w-full">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 mb-2">{t.login.welcome}</h1>
            <p className="text-slate-500 font-medium">{t.login.subtitle}</p>
          </div>

          {/* ── Email / Phone Toggle Switch ── */}
          <div className="flex items-center bg-slate-100 rounded-2xl p-1 mb-8 gap-1">
            <button
              type="button"
              onClick={() => { setLoginType("email"); setError(""); setPhoneInputError(""); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300",
                loginType === "email"
                  ? "bg-white text-blue-600 shadow-md shadow-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => { setLoginType("phone"); setError(""); setPhoneInputError(""); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300",
                loginType === "phone"
                  ? "bg-white text-blue-600 shadow-md shadow-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Phone className="w-4 h-4" />
              {t.common.phone}
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            {/* ── Animated Login Field ── */}
            <AnimatePresence mode="wait">
              {loginType === "email" ? (
                <motion.div
                  key="email-field"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    {t.login.emailLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 text-lg">@</div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.login.emailPlaceholder}
                      className="input-premium pl-12"
                      autoComplete="email"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="phone-field"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    {t.login.phoneLabel}
                  </label>
                  <div className="flex gap-2">
                    {/* Country code */}
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        value={dialCode}
                        onChange={(e) => handleDialChange(e.target.value)}
                        className={`appearance-none bg-white border rounded-2xl pl-9 pr-4 h-[50px] text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer min-w-[130px] ${
                          phoneValid === true ? "border-emerald-400 focus:border-emerald-500" :
                          phoneValid === false ? "border-rose-400 focus:border-rose-500" :
                          "border-slate-200 focus:border-blue-500"
                        }`}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code + c.label} value={c.code}>
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
                        onChange={(e) => handlePhoneInput(dialCode, e.target.value)}
                        placeholder={t.login.phonePlaceholder}
                        className={`input-premium pl-12 pr-10 w-full transition-all ${
                          phoneValid === true ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10" :
                          phoneValid === false ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10" : ""
                        }`}
                        autoComplete="tel"
                      />
                      {/* Live validation icon */}
                      {phoneValid === true && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 text-lg">✓</span>
                      )}
                      {phoneValid === false && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 text-lg">✗</span>
                      )}
                    </div>
                  </div>
                  {phoneInputError && (
                    <p className="text-rose-500 text-xs font-bold ml-1 flex items-center gap-1">
                      <span>⚠</span> {phoneInputError}
                    </p>
                  )}
                  {phoneValid === true && (
                    <p className="text-emerald-600 text-xs font-bold ml-1">✓ {t.login.validPhoneMsg}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Password ── */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t.login.passwordLabel}</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  className="input-premium pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 mt-4"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : t.login.submitBtn}
              {!isSubmitting && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 font-medium">
            {t.login.noAccount}{" "}
            <Link href="/register-company" className="text-blue-600 font-bold hover:underline">
              {t.login.registerLink}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
