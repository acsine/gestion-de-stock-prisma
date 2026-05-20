"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { 
  ShieldAlert, Send, LogOut, Loader2, MessageSquare, Sparkles, User, 
  CreditCard, Upload, CheckCircle2, ChevronRight, AlertCircle, HelpCircle, PhoneCall
} from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/Toast";

interface Message {
  id: string;
  content: string;
  isAdmin: boolean;
  createdAt: string;
  user: {
    name: string;
  };
}

export default function BlockedPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"chat" | "pricing">("pricing");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [checkingActiveTicket, setCheckingActiveTicket] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, show: showToast, close: closeToast } = useToast();
  
  // States for subscription and payment
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; label: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"auto" | "manual" | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [autoPaying, setAutoPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVC, setCardCVC] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 0. Check real-time user activation status on page mount / reload
  useEffect(() => {
    async function verifyUserStatus() {
      try {
        const res = await fetch("/api/users/check-status", { cache: "no-store" });
        if (res.ok) {
          const status = await res.json();
          if (status.active) {
            // User is active, redirect to dashboard!
            window.location.href = "/dashboard";
          }
        }
      } catch (err) {
        console.error("Erreur lors de la vérification du statut utilisateur", err);
      }
    }
    verifyUserStatus();
  }, []);

  // 1. Check if the user already has an active support ticket on load
  useEffect(() => {
    async function checkActiveTicket() {
      try {
        const res = await fetch("/api/support/tickets");
        if (res.ok) {
          const { data } = await res.json();
          // Find if there is an existing unblocked request or payment ticket
          const existingTicket = data.find((t: any) => 
            t.subject.startsWith("Demande de déblocage") || t.subject.startsWith("Paiement Manuel")
          );
          if (existingTicket) {
            setActiveTicketId(existingTicket.id);
            setActiveTab("chat"); // Auto switch to chat if there is a ticket in progress
          }
        }
      } catch (err) {
        console.error("Impossible de récupérer les tickets existants", err);
      } finally {
        setCheckingActiveTicket(false);
      }
    }
    
    if (session?.user) {
      checkActiveTicket();
    }
  }, [session]);

  // 2. Establish Server-Sent Events (SSE) connection once we have an active ticket
  useEffect(() => {
    if (!activeTicketId) return;

    const eventSource = new EventSource(`/api/support/tickets/${activeTicketId}/messages/sse`);

    eventSource.onmessage = (event) => {
      try {
        const newMessages = JSON.parse(event.data);
        setMessages(newMessages);

        // Scan messages to check if the admin validated the manual payment
        const validationMessage = newMessages.find((msg: any) => 
          msg.isAdmin && msg.content.includes("PAIEMENT VALIDÉ")
        );
        if (validationMessage) {
          // Automatic premium redirect after a 5 second delay so they can read the notification message!
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 5000);
        }
      } catch (err) {
        console.error("Erreur lors du traitement SSE", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("Reconnexion au flux SSE...", err);
    };

    return () => {
      eventSource.close();
    };
  }, [activeTicketId]);

  // 3. Create the ticket (First Message)
  const handleFirstMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !session?.user) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `Demande de déblocage — ${session.user.name || "Utilisateur"}`,
          message: message,
          priority: "URGENTE",
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Impossible de créer le ticket d'assistance");

      setActiveTicketId(resData.data.id);
      setMessages(resData.data.messages || []);
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // 4. Send follow-up messages inside the active ticket chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeTicketId) return;

    const currentMsg = message;
    setMessage("");

    try {
      const res = await fetch(`/api/support/tickets/${activeTicketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentMsg }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Impossible d'envoyer le message");
      }
    } catch (err: any) {
      setError(err.message || "Impossible d'envoyer le message");
    }
  };

  // 5. Handle manual file selection and upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setScreenshotFile(file);
    setError(null);

    // Upload immediately
    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue lors du chargement");
      
      setScreenshotUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Impossible de charger le fichier justificatif");
      setScreenshotFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  // 6. Submit Manual Orange Money Payment Ticket
  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !screenshotUrl || !session?.user) return;

    setLoading(true);
    setError(null);

    const detailText = `Demande de souscription à la formule ${selectedPlan.label} (Prix: ${selectedPlan.price.toLocaleString("fr-FR")} XAF). Le paiement Orange Money a été effectué au 699259366. Justificatif de transfert : ![Reçu](${screenshotUrl}).`;

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `Paiement Manuel — ${selectedPlan.name}`,
          message: detailText,
          priority: "URGENTE",
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Impossible de transmettre le justificatif.");

      setActiveTicketId(resData.data.id);
      setMessages(resData.data.messages || []);
      
      // Cleanup States and Switch to Live Chat to let them discuss!
      setSelectedPlan(null);
      setPaymentMethod(null);
      setScreenshotFile(null);
      setScreenshotUrl(null);
      setActiveTab("chat");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // 7. Submit Automatic Payment Simulation
  const handleAutoPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setAutoPaying(true);
    setError(null);

    // Simulate 3 seconds bank communication delay
    setTimeout(async () => {
      try {
        const res = await fetch("/api/tenants/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenseName: selectedPlan.name }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Une erreur est survenue");

        // Success! Show toast then redirect
        showToast(`Félicitations ! Votre formule ${selectedPlan.label} a été activée. Accès débloqué !`, "success");
        setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
      } catch (err: any) {
        setError(err.message || "La validation bancaire a échoué. Veuillez réessayer.");
        setAutoPaying(false);
      }
    }, 3000);
  };

  if (checkingActiveTicket) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Chargement de votre espace...</p>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={closeToast} />
    <div className="min-h-screen w-full bg-white flex flex-col md:flex-row relative font-sans overflow-hidden">
      {/* Sleek dynamic colorful glassmorphism glow backdrops */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Left Side: Dynamic Human Information / Blocked Notice */}
      <div className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-8 flex flex-col justify-between flex-shrink-0 relative z-10 h-auto md:h-screen">
          <div>
            <div className="w-12 h-12 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Compte Bloqué</h1>
            <p className="text-slate-500 font-medium text-xs leading-relaxed mb-6">
              Bonjour <strong>{session?.user?.name || "Utilisateur"}</strong>. Votre espace est inactif ou votre licence a expiré. Vous devez souscrire ou contacter l'assistance.
            </p>

            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 mb-1">Abonnement Express</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Sélectionnez une formule annuelle et payez par Orange Money ou Carte pour réactiver vos accès instantanément.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200/80 flex items-center justify-between">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Thabor Solution</span>
          </div>
        </div>

        {/* Right Side: Tab Container */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden h-screen">
          
          {/* Top Tabs */}
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/20">
            <div className="flex gap-4">
              <button
                onClick={() => { setActiveTab("pricing"); setSelectedPlan(null); setPaymentMethod(null); }}
                className={`text-xs font-black uppercase tracking-wider pb-5 pt-5 border-b-2 transition-all ${
                  activeTab === "pricing" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                1. Tarifs & Abonnements
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`text-xs font-black uppercase tracking-wider pb-5 pt-5 border-b-2 transition-all relative ${
                  activeTab === "chat" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                2. Assistance en direct
                {messages.length > 0 && (
                  <span className="absolute top-3 -right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>
            </div>
            
            {activeTicketId && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Discussion Active
              </span>
            )}
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto relative">
            
            {activeTab === "pricing" ? (
              // PRICING & PAYMENT TAB
              <div className="p-8">
                {!selectedPlan ? (
                  // Grid selection of plans
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="text-center max-w-md mx-auto">
                      <h2 className="text-xl font-black text-slate-900 mb-2">Choisissez votre formule</h2>
                      <p className="text-slate-400 font-medium text-xs">
                        Trouvez le forfait parfait pour piloter les stocks et les ventes de votre commerce.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* GRATUIT PLAN */}
                      <div className="bg-white border border-slate-200 hover:border-slate-350 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between shadow-sm relative group hover:scale-[1.01]">
                        <div>
                          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase bg-slate-100 px-2.5 py-1 rounded-md">Débutant</span>
                          <h3 className="text-lg font-black text-slate-800 mt-4">Formule Gratuit</h3>
                          <p className="text-slate-400 text-[10px] mt-1">Idéal pour tester l'interface</p>
                          <div className="my-6">
                            <span className="text-2xl font-black text-slate-900">0 XAF</span>
                            <span className="text-slate-400 text-xs font-semibold"> / 1 jour</span>
                          </div>
                          <ul className="space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600">
                            <li className="flex items-center gap-2">✓ 2 Utilisateurs max</li>
                            <li className="flex items-center gap-2">✓ 50 Produits max</li>
                            <li className="flex items-center gap- gap-2 text-slate-400 line-through">✗ Téléchargements</li>
                          </ul>
                        </div>
                        <button
                          onClick={() => setSelectedPlan({ name: "GRATUIT", price: 0, label: "Gratuit" })}
                          className="w-full mt-8 py-3.5 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all"
                        >
                          Choisir Gratuit
                        </button>
                      </div>

                      {/* PROFESSIONNEL PLAN */}
                      <div className="bg-white border-2 border-blue-600 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between shadow-md relative group hover:scale-[1.01]">
                        <span className="absolute top-0 right-6 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-md">
                          Recommandé
                        </span>
                        <div>
                          <span className="text-[9px] font-black tracking-widest text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-md">Commerce</span>
                          <h3 className="text-lg font-black text-slate-800 mt-4">Professionnel</h3>
                          <p className="text-slate-400 text-[10px] mt-1">Pour les commerces en pleine croissance</p>
                          <div className="my-6">
                            <span className="text-2xl font-black text-slate-900">50 000 XAF</span>
                            <span className="text-slate-400 text-xs font-semibold"> / an</span>
                          </div>
                          <ul className="space-y-2 border-t border-blue-50 pt-4 text-xs font-semibold text-slate-600">
                            <li className="flex items-center gap-2">✓ 10 Utilisateurs max</li>
                            <li className="flex items-center gap-2">✓ 5 000 Produits max</li>
                            <li className="flex items-center gap-2">✓ Téléchargements activés</li>
                            <li className="flex items-center gap-2">✓ Support Standard</li>
                          </ul>
                        </div>
                        <button
                          onClick={() => setSelectedPlan({ name: "PROFESSIONNEL", price: 50000, label: "Professionnel" })}
                          className="w-full mt-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-blue-500/20"
                        >
                          Choisir Pro
                        </button>
                      </div>

                      {/* PLAN ENTREPRISE */}
                      <div className="bg-white border border-slate-200 hover:border-slate-350 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between shadow-sm relative group hover:scale-[1.01]">
                        <div>
                          <span className="text-[9px] font-black tracking-widest text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-md">Multi-magasin</span>
                          <h3 className="text-lg font-black text-slate-800 mt-4">Entreprise</h3>
                          <p className="text-slate-400 text-[10px] mt-1">Puissance maximale et illimité</p>
                          <div className="my-6">
                            <span className="text-2xl font-black text-slate-900">150 000 XAF</span>
                            <span className="text-slate-400 text-xs font-semibold"> / an</span>
                          </div>
                          <ul className="space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600">
                            <li className="flex items-center gap-2">✓ 100 Utilisateurs max</li>
                            <li className="flex items-center gap-2">✓ Produits Illimités</li>
                            <li className="flex items-center gap-2">✓ Options de téléchargement</li>
                            <li className="flex items-center gap-2">✓ Support VIP 24/7</li>
                          </ul>
                        </div>
                        <button
                          onClick={() => setSelectedPlan({ name: "ENTREPRISE", price: 150000, label: "Entreprise" })}
                          className="w-full mt-8 py-3.5 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all"
                        >
                          Choisir Entreprise
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Plan chosen, show Payment Gateways
                  <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
                    <button
                      onClick={() => { setSelectedPlan(null); setPaymentMethod(null); }}
                      className="text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest flex items-center gap-1"
                    >
                      ← Retour aux forfaits
                    </button>

                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Formule choisie</span>
                        <h3 className="text-base font-black text-slate-800">{selectedPlan.label}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-900">{selectedPlan.price.toLocaleString("fr-FR")} XAF</span>
                      </div>
                    </div>

                    {!paymentMethod ? (
                      // Choose automatic vs manual
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center my-4">Moyen de paiement</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            onClick={() => setPaymentMethod("auto")}
                            className="bg-white border border-slate-200 hover:border-blue-500 rounded-3xl p-6 text-center transition-all group flex flex-col items-center justify-center"
                          >
                            <CreditCard className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-105 transition-transform" />
                            <span className="text-xs font-black text-slate-800">Paiement Automatique</span>
                            <span className="text-[10px] text-slate-400 mt-1 leading-normal">
                              Carte Bancaire - Activation immédiate
                            </span>
                          </button>

                          <button
                            onClick={() => setPaymentMethod("manual")}
                            className="bg-white border border-slate-200 hover:border-blue-500 rounded-3xl p-6 text-center transition-all group flex flex-col items-center justify-center"
                          >
                            <PhoneCall className="w-8 h-8 text-emerald-600 mb-3 group-hover:scale-105 transition-transform" />
                            <span className="text-xs font-black text-slate-800">Paiement Manuel</span>
                            <span className="text-[10px] text-slate-400 mt-1 leading-normal">
                              Dépôt Orange Money - Validation admin
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : paymentMethod === "auto" ? (
                      // Automatic payment simulation checkout
                      <form onSubmit={handleAutoPaymentSubmit} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-4">
                        <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-blue-600" /> Saisir vos coordonnées bancaires
                        </h3>

                        {autoPaying ? (
                          <div className="py-12 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-300">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                            <div>
                              <h4 className="text-sm font-black text-slate-800">Validation bancaire en cours...</h4>
                              <p className="text-[10px] text-slate-400 mt-1">Veuillez patienter pendant la validation de la transaction sécurisée.</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Numéro de carte</label>
                              <input
                                type="text"
                                required
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                placeholder="4000 1234 5678 9010"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Date d'expiration</label>
                                <input
                                  type="text"
                                  required
                                  value={cardExpiry}
                                  onChange={(e) => setCardExpiry(e.target.value)}
                                  placeholder="MM/AA"
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Code CVC</label>
                                <input
                                  type="text"
                                  required
                                  value={cardCVC}
                                  onChange={(e) => setCardCVC(e.target.value)}
                                  placeholder="123"
                                  maxLength={4}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                                />
                              </div>
                            </div>

                            {error && (
                              <p className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-100 p-3 rounded-xl">{error}</p>
                            )}

                            <button
                              type="submit"
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-300"
                            >
                              Confirmer et Payer {selectedPlan.price.toLocaleString("fr-FR")} XAF
                            </button>
                          </>
                        )}
                      </form>
                    ) : (
                      // Manual Orange Money Payment Workflow
                      <form onSubmit={handleManualPaymentSubmit} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-5">
                        <div className="text-center p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                          <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2">Instructions Dépôt Orange Money</h4>
                          <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                            Veuillez effectuer un transfert Orange Money d'un montant de **{selectedPlan.price.toLocaleString("fr-FR")} XAF** au numéro ci-dessous :
                          </p>
                          <div className="text-xl font-black text-emerald-950 my-2 select-all cursor-pointer" title="Copier le numéro">
                            699 259 366
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            Destinataire : Thabor Solution
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                            Justificatif de paiement (Capture d'écran)
                          </label>
                          
                          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50 cursor-pointer relative group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              required={!screenshotUrl}
                            />
                            
                            {uploadingFile ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                <span className="text-xs font-semibold text-slate-400">Fichier en cours de chargement...</span>
                              </div>
                            ) : screenshotFile ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                <span className="text-xs font-bold text-slate-800">{screenshotFile.name}</span>
                                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-150">Justificatif chargé</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Upload className="w-8 h-8 text-slate-400 group-hover:scale-105 transition-transform" />
                                <span className="text-xs font-bold text-slate-600">Sélectionnez ou glissez la capture d'écran</span>
                                <span className="text-[9px] text-slate-400 leading-normal">Fichiers PNG, JPG ou JPEG acceptés</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {error && (
                          <p className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-100 p-3 rounded-xl">{error}</p>
                        )}

                        <button
                          type="submit"
                          disabled={loading || uploadingFile || !screenshotUrl}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all duration-300"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Transmission en cours...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Envoyer le justificatif à l'administrateur</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // REAL-TIME SUPPORT CHAT TAB
              <div className="h-full flex flex-col bg-white">
                {activeTicketId ? (
                  // Active Chat View
                  <div className="h-full flex flex-col justify-between">
                    
                    {/* Top bar chat details */}
                    <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/10">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          Assistance Thabor Solution
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">Flux en direct SSE activé</span>
                    </div>

                    {/* Chat message list container */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 h-[50vh]">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                          <p className="text-xs text-slate-400">Connexion sécurisée en direct...</p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isMe = !msg.isAdmin;
                          
                          // Check if message content is a markdown image from receipt
                          const imgRegex = /!\[Reçu\]\((.+)\)/;
                          const hasImg = msg.content.match(imgRegex);

                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                            >
                              {/* Avatar */}
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border text-[10px] font-bold ${
                                isMe 
                                  ? "bg-blue-50 text-blue-600 border-blue-100" 
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                                {isMe ? <User className="w-4 h-4" /> : "AD"}
                              </div>

                              {/* Content bubble */}
                              <div className="space-y-1">
                                <div className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                                  isMe
                                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none"
                                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                                }`}>
                                  {hasImg ? (
                                    <div className="space-y-2">
                                      <p>{msg.content.replace(imgRegex, "")}</p>
                                      <div className="relative rounded-lg overflow-hidden border border-slate-200/20 shadow-sm max-w-xs max-h-48">
                                        <img src={hasImg[1]} alt="Justificatif de paiement" className="object-contain max-h-48" />
                                      </div>
                                    </div>
                                  ) : (
                                    <p>{msg.content}</p>
                                  )}
                                </div>
                                <p className={`text-[9px] font-bold text-slate-400 ${isMe ? "text-right" : "text-left"}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input message form */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Écrivez un message ici..."
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all duration-300"
                        required
                      />
                      <button
                        type="submit"
                        disabled={!message.trim()}
                        className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/15 disabled:opacity-40 transition-all duration-300 hover:scale-105"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>

                  </div>
                ) : (
                  // Welcome & Standard Ticket Creation Form
                  <div className="flex-1 flex flex-col justify-center max-w-md mx-auto p-8 text-center h-full">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-sm animate-pulse">
                      <MessageSquare className="w-8 h-8" />
                    </div>

                    <h2 className="text-xl font-black text-slate-900 mb-2">Entrer en contact</h2>
                    <p className="text-slate-500 font-medium text-xs leading-relaxed mb-8">
                      Laissez un message à l'administrateur système ci-dessous. Dès que vous validerez, une session de chat en direct s'ouvrira pour suivre votre demande de réactivation.
                    </p>

                    <form onSubmit={handleFirstMessageSubmit} className="space-y-4 text-left">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Votre Message
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                          rows={4}
                          placeholder="Expliquez la situation ou posez votre question pour réactiver votre accès..."
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white placeholder-slate-400 resize-none transition-all duration-300"
                        />
                      </div>

                      {error && (
                        <p className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-100 p-3 rounded-xl">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={loading || !message.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all duration-300 active:scale-95"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Connexion en cours...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Envoyer et Ouvrir le Chat</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

    </div>
  </>
  );
}

