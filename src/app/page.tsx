"use client";

import { motion } from "framer-motion";
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

export default function LandingPage() {
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
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#features" className="hover:text-white transition-colors">Plateforme</a>
            <a href="#mobile" className="hover:text-white transition-colors">Mobile</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Connexion</Link>
            <Link href="/register-company" className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Démarrer
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
            <Zap className="w-3 h-3 text-blue-500" /> ThaborSolution 2.0 est maintenant disponible
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-6 leading-[1.1]"
          >
            Dominez votre <br /> supply chain.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-neutral-400 max-w-3xl mb-10 font-normal leading-relaxed"
          >
            L&apos;infrastructure ERP SaaS conçue pour les entreprises d&apos;élite. Gérez des milliers de références avec une précision chirurgicale grâce à une puissance cloud combinée à une résilience locale pour une gestion de stock sans compromis.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center gap-4 mb-20"
          >
            <Link href="/register-company" className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-full hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
              Créer mon entreprise <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white border border-white/10 font-semibold rounded-full hover:bg-white/10 transition-colors flex items-center justify-center">
              Découvrir la plateforme
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
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">Une architecture de pointe.</h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">Construit pour la vitesse, la fiabilité et l&apos;échelle mondiale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1 - Tech Architecture */}
            <motion.div {...fadeUp} className="md:col-span-2 relative group overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A] h-[500px]">
              <Image src="/image/7.png" alt="Tech" width={1200} height={800} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-12 z-10 w-full max-w-3xl">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/10 shadow-lg">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Infrastructure Multi-Tenant Native</h3>
                <p className="text-neutral-400 text-lg leading-relaxed">
                  Isolation totale et sécurité de niveau bancaire pour vos données. Notre architecture multi-locataire garantit que vos informations restent privées tout en profitant d&apos;une infrastructure mondiale évolutive. Chaque entreprise dispose d&apos;un environnement dédié et sécurisé, synchronisé en temps réel avec vos terminaux locaux.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 - POS */}
            <motion.div {...fadeUp} className="relative group overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A] h-[450px]">
              <Image src="/image/2.png" alt="POS" width={800} height={600} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-10 z-10">
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Point de Vente (POS) Intelligent</h3>
                <p className="text-neutral-400 mb-6">Optimisez vos transactions quotidiennes avec une interface de caisse ultra-rapide capable de fonctionner même en cas de coupure internet.</p>
                <ul className="space-y-3">
                  {["Facturation automatique et conforme", "Gestion dynamique des stocks et remises", "Génération instantanée de tickets et rapports"].map((item, i) => (
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
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Logistique de Précision</h3>
                <p className="text-neutral-400 mb-6">Prenez le contrôle total de vos flux physiques. Suivi des mouvements de stock, alertes de rupture prédictives et gestion multi-entrepôts centralisée.</p>
                <div className="flex gap-8 mt-4">
                  <div>
                    <div className="text-3xl font-bold text-white">99.9%</div>
                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">Précision</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">2x</div>
                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">Plus Rapide</div>
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
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Votre stock en poche</h3>
                <p className="text-neutral-400">Scannez n&apos;importe quel produit avec votre smartphone. Détection instantanée et mise à jour en temps réel.</p>
              </div>
            </motion.div>

            <motion.div {...fadeUp} className="relative group overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A] h-[400px]">
              <Image src="/image/3.png" alt="Partnership" width={800} height={600} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-10 z-10">
                <Globe className="w-8 h-8 text-white mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Bâtissons votre succès</h3>
                <p className="text-neutral-400">Le partenaire logiciel de confiance des entrepreneurs africains qui voient grand à l&apos;international.</p>
              </div>
            </motion.div>
        </section>

        {/* DETAILED INFO SECTION */}
        <section className="px-6 max-w-7xl mx-auto mt-40">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <motion.div {...fadeUp}>
              <h4 className="text-white text-xl font-bold mb-4">Sécurité sans compromis</h4>
              <p className="text-neutral-500 leading-relaxed">
                Chaque donnée est chiffrée et isolée au sein de notre architecture multi-tenant. Nous utilisons des protocoles de sécurité de pointe pour garantir que vos inventaires, vos chiffres d&apos;affaires et vos données clients restent votre propriété exclusive, à l&apos;abri des regards indiscrets.
              </p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
              <h4 className="text-white text-xl font-bold mb-4">Résilience Hors-ligne</h4>
              <p className="text-neutral-500 leading-relaxed">
                Contrairement aux solutions 100% cloud, ThaborSolution intègre un moteur de synchronisation hybride. Travaillez sereinement même en cas de coupure internet : vos ventes et mouvements de stock sont enregistrés localement et se synchronisent automatiquement dès que la connexion revient.
              </p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
              <h4 className="text-white text-xl font-bold mb-4">Évolutivité Mondiale</h4>
              <p className="text-neutral-500 leading-relaxed">
                Que vous gériez une petite boutique ou un réseau international d&apos;entrepôts, notre plateforme s&apos;adapte à votre croissance. Ajoutez des magasins, des employés et des milliers de produits sans jamais ressentir de ralentissement, grâce à notre backend haute performance.
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
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">Prêt à scaler ?</h2>
              <p className="text-neutral-400 text-lg md:text-xl mb-10 max-w-xl mx-auto">Rejoignez les entreprises d&apos;élite qui dominent leur logistique avec l&apos;infrastructure ThaborSolution.</p>
              <Link href="/register-company" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                Créer mon entreprise <ArrowRight className="w-5 h-5" />
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
            &copy; {new Date().getFullYear()} ThaborSolution. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
