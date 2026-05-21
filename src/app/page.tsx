"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight, 
  Package, 
  RefreshCw, 
  CheckCircle2,
  Zap,
  Layers,
  Smartphone,
  ShieldCheck,
  Globe,
  Download
} from "lucide-react";
import { useTranslation } from "@/locales/i18n";

export default function LandingPage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, ease: "easeOut" as const }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-neutral-200 font-sans overflow-x-hidden selection:bg-blue-500/30">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        {/* Top Glow */}
        <div className="absolute top-[-20%] w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <Package className="text-black w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">ThaborSolution</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">{t.landing.features}</a>
            <a href="#features" className="hover:text-white transition-colors">{t.landing.platform}</a>
            <a href="#mobile" className="hover:text-white transition-colors">{t.landing.mobile}</a>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              onClick={() => setIsLoading(true)}
              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            >
              {t.landing.login}
            </Link>
            <Link 
              href="/register-company" 
              onClick={() => setIsLoading(true)}
              className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {t.landing.getStarted}
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20">
        {/* HERO SECTION */}
        <section className="px-6 flex flex-col items-center text-center max-w-5xl mx-auto mb-32">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-neutral-300 text-xs font-medium mb-8 backdrop-blur-sm"
          >
            <Zap className="w-3 h-3 text-blue-500" /> {t.landing.tagline}
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-6 leading-[1.1]"
          >
            {t.landing.title.split(" ").slice(0, 2).join(" ")} <br /> {t.landing.title.split(" ").slice(2).join(" ")}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-neutral-400 max-w-3xl mb-10 font-normal leading-relaxed"
          >
            {t.landing.subtitle}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center gap-4 mb-20"
          >
            <Link 
              href="/register-company" 
              onClick={() => setIsLoading(true)}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-full hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            >
              {t.landing.createCompany} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white border border-white/10 font-semibold rounded-full hover:bg-white/10 transition-colors flex items-center justify-center">
              {t.landing.discoverPlatform}
            </Link>
          </motion.div>

          {/* Hero Image Card */}
          <div className="relative w-full group">
            <div className="absolute -inset-20 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <motion.div 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="relative w-full overflow-hidden"
            >
              <div className="relative w-full aspect-video md:aspect-[21/9] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_10%,transparent_100%)]">
                <Image 
                  src="/image/1.png" 
                  alt="Dashboard" 
                  fill
                  className="object-cover object-top opacity-40 transition-opacity duration-1000 group-hover:opacity-60"
                  unoptimized
                  priority
                />
                {/* Seamless Edge Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-90"></div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* BENTO GRID FEATURES */}
        <section id="features" className="px-6 max-w-7xl mx-auto space-y-6 pt-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">{t.landing.bentoTitle}</h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">{t.landing.bentoSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1 - Tech Architecture */}
            <motion.div {...fadeUp} className="md:col-span-2 relative group overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A] h-[500px]">
              <Image src="/image/7.png" alt="Tech" width={1200} height={800} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 p-12 z-10 w-full max-w-3xl">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/10 shadow-lg">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">{t.landing.feat1Title}</h3>
                <p className="text-neutral-400 text-lg leading-relaxed">
                  {t.landing.feat1Desc}
                </p>
              </div>
            </motion.div>

            {/* Feature 2 - POS */}
            <motion.div {...fadeUp} className="relative group overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A] h-[450px]">
              <Image src="/image/2.png" alt="POS" width={800} height={600} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-10 z-10">
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{t.landing.feat2Title}</h3>
                <p className="text-neutral-400 mb-6">{t.landing.feat2Desc}</p>
                <ul className="space-y-3">
                  {[t.landing.feat2Item1, t.landing.feat2Item2, t.landing.feat2Item3].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-neutral-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Feature 3 - Logistics */}
            <motion.div {...fadeUp} className="relative group overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A] h-[450px]">
              <Image src="/image/4.png" alt="Logistics" width={800} height={600} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-10 z-10">
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{t.landing.feat3Title}</h3>
                <p className="text-neutral-400 mb-6">{t.landing.feat3Desc}</p>
                <div className="flex gap-8 mt-4">
                  <div>
                    <div className="text-3xl font-bold text-white">{t.landing.feat3Stat1}</div>
                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">{t.landing.feat3Stat1Label}</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">{t.landing.feat3Stat2}</div>
                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">{t.landing.feat3Stat2Label}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* MOBILE & PARTNERSHIP */}
        <section id="mobile" className="px-6 max-w-7xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div {...fadeUp} className="relative group overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A] h-[400px]">
              <Image src="/image/6.png" alt="Mobile App" width={800} height={600} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-10 z-10">
                <Smartphone className="w-8 h-8 text-white mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{t.landing.mobileTitle}</h3>
                <p className="text-neutral-400">{t.landing.mobileDesc}</p>
              </div>
            </motion.div>

            <motion.div {...fadeUp} className="relative group overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A] h-[400px]">
              <Image src="/image/3.png" alt="Partnership" width={800} height={600} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-10 z-10">
                <Globe className="w-8 h-8 text-white mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{t.landing.partnershipTitle}</h3>
                <p className="text-neutral-400">{t.landing.partnershipDesc}</p>
              </div>
            </motion.div>
        </section>

        {/* DETAILED INFO SECTION */}
        <section className="px-6 max-w-7xl mx-auto mt-40">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <motion.div {...fadeUp}>
              <h4 className="text-white text-xl font-bold mb-4">{t.landing.secTitle}</h4>
              <p className="text-neutral-500 leading-relaxed">
                {t.landing.secDesc}
              </p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
              <h4 className="text-white text-xl font-bold mb-4">{t.landing.resTitle}</h4>
              <p className="text-neutral-500 leading-relaxed">
                {t.landing.resDesc}
              </p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
              <h4 className="text-white text-xl font-bold mb-4">{t.landing.scaleTitle}</h4>
              <p className="text-neutral-500 leading-relaxed">
                {t.landing.scaleDesc}
              </p>
            </motion.div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="px-6 mt-32 mb-20 max-w-5xl mx-auto">
          <motion.div 
            {...fadeUp} 
            className="relative rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#111] to-black overflow-hidden p-10 md:p-20 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] group"
          >
            <Image src="/image/5.png" alt="CTA" width={1000} height={600} className="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-20 transition-opacity duration-700 mix-blend-screen" unoptimized />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">{t.landing.ready}</h2>
              <p className="text-neutral-400 text-lg md:text-xl mb-10 max-w-xl mx-auto">{t.landing.readySubtitle}</p>
              <Link 
                href="/register-company" 
                onClick={() => setIsLoading(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              >
                {t.landing.createCompany} <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#000000]">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-neutral-400" />
            <span className="text-neutral-400 font-semibold tracking-tight">ThaborSolution Stock</span>
          </div>
          <p className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} ThaborSolution. {t.landing.rights}
          </p>
        </div>
      </footer>

      {/* Premium Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-12 h-12 border-4 border-t-white border-white/20 rounded-full mb-4 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            />
            <span className="text-sm font-bold tracking-widest uppercase text-neutral-300">
              Chargement...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
