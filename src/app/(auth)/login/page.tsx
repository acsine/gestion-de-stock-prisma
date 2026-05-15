"use client";
// src/app/(auth)/login/page.tsx
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Boxes, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError("");
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setError("Email ou mot de passe incorrect");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const features = [
    { title: "Gérez votre stock", desc: "Suivez vos produits en temps réel, partout en Afrique." },
    { title: "Facturez en un clic", desc: "Générez des factures professionnelles instantanément." },
    { title: "Synchro Cloud & Local", desc: "Travaillez même sans connexion, vos données sont en sécurité." }
  ];
  const [featureIdx, setFeatureIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIdx((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Side: Illustration Dynamique */}
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
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
                  {features[featureIdx].title.split(" ").map((word, i) => (
                    <span key={i} className={i === features[featureIdx].title.split(" ").length - 1 ? "text-blue-500" : ""}>
                      {word}{" "}
                    </span>
                  ))}
                </h2>
                <p className="text-2xl text-white/60 font-medium leading-relaxed">
                  {features[featureIdx].desc}
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Dots Indicator */}
          <div className="flex gap-2">
            {features.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1.5 transition-all duration-500 rounded-full",
                  i === featureIdx ? "w-10 bg-blue-500" : "w-2 bg-white/20"
                )} 
              />
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
      </div>

      {/* Right Side: Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-24 bg-mesh">
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full"
        >
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 mb-2">Bienvenue</h1>
            <p className="text-slate-500 font-medium">Connectez-vous pour continuer sur votre espace.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Adresse email</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400">@</div>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="nom@exemple.com"
                  className="input-premium pl-12"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-rose-500 text-xs font-bold mt-1 ml-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
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
              {errors.password && <p className="text-rose-500 text-xs font-bold mt-1 ml-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 mt-4"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Se connecter"}
              {!isSubmitting && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>



          <p className="mt-8 text-center text-slate-500 font-medium">
            Pas encore de compte ? <Link href="/register-company" className="text-blue-600 font-bold hover:underline">Créer une entreprise</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
