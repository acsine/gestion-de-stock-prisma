"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { 
  ShieldAlert, Send, LogOut, Loader2, MessageSquare, Sparkles, User, 
  CreditCard, Upload, CheckCircle2, ChevronRight, AlertCircle, HelpCircle, PhoneCall
} from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/locales/i18n";

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
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<"chat" | "pricing">("pricing");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [checkingActiveTicket, setCheckingActiveTicket] = useState(true);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toasts, show: showToast, close: closeToast } = useToast();
  
  // States for subscription and payment
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; label: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"auto" | "manual" | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [autoPaying, setAutoPaying] = useState(false);
  const [momoService, setMomoService] = useState<"MTN" | "ORANGE">("MTN");
  const [momoPhone, setMomoPhone] = useState("");
  const [pollInterval, setPollInterval] = useState<any>(null);
  const [dbLicenses, setDbLicenses] = useState<any[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Fetch licenses dynamically from the database
  useEffect(() => {
    async function fetchLicenses() {
      try {
        const res = await fetch("/api/licenses");
        if (res.ok) {
          const data = await res.json();
          setDbLicenses(data);
        }
      } catch (err) {
        console.error("Error fetching licenses", err);
      } finally {
        setLicensesLoading(false);
      }
    }
    fetchLicenses();
  }, []);

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
          } else {
            setBlockedReason(status.reason || null);
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

  // 7. Submit Automatic Payment via Paayit
  const handleAutoPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setAutoPaying(true);
    setError(null);

    // If it's a free plan (0 XAF), bypass payment gateway
    if (selectedPlan.price === 0) {
      try {
        const res = await fetch("/api/tenants/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenseName: selectedPlan.name }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Une erreur est survenue");

        const successMsg = language === "fr" 
          ? `Félicitations ! Votre formule ${selectedPlan.label} a été activée. Accès débloqué !`
          : `Congratulations! Your plan ${selectedPlan.label} has been activated. Access restored!`;
        showToast(successMsg, "success");
        setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
      } catch (err: any) {
        setError(err.message || (language === "fr" ? "L'activation a échoué." : "Activation failed."));
        setAutoPaying(false);
      }
      return;
    }

    // Call backend API to initiate transaction
    try {
      const res = await fetch("/api/payment/paayit/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseName: selectedPlan.name,
          phoneNumber: momoPhone,
          service: momoService
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible d'initier le paiement.");

      const successMsg = language === "fr"
        ? "Demande envoyée ! Veuillez saisir votre code PIN sur votre téléphone pour autoriser le débit."
        : "Request sent! Please enter your PIN on your phone to authorize the transaction.";
      showToast(successMsg, "success");

      // Start polling for real-time status update (every 4 seconds, max 2 minutes)
      let pollCount = 0;
      const maxPolls = 30; // 30 * 4s = 2 minutes
      const intervalId = setInterval(async () => {
        pollCount++;
        try {
          const statusRes = await fetch("/api/users/check-status", { cache: "no-store" });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.active) {
              clearInterval(intervalId);
              showToast(
                language === "fr" 
                  ? "Paiement validé avec succès ! Déblocage de votre espace..." 
                  : "Payment successfully validated! Activating your workspace...", 
                "success"
              );
              setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
              return;
            }
          }
        } catch (pollErr) {
          console.error("Erreur de synchronisation du statut", pollErr);
        }

        // Timeout after 2 minutes — stop the infinite loading
        if (pollCount >= maxPolls) {
          clearInterval(intervalId);
          setAutoPaying(false);
          showToast(
            language === "fr"
              ? "Le délai d'attente est dépassé. Si le paiement a été effectué, veuillez actualiser la page."
              : "Timeout reached. If the payment was made, please refresh the page.",
            "error"
          );
        }
      }, 4000);

      setPollInterval(intervalId);
    } catch (err: any) {
      setError(err.message || (language === "fr" ? "La transaction a échoué. Veuillez réessayer." : "Transaction failed. Please try again."));
      setAutoPaying(false);
    }
  };

  if (checkingActiveTicket) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-500">
          {language === "fr" ? "Chargement de votre espace..." : "Loading your workspace..."}
        </p>
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

            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
              {t.blocked.title}
            </h1>
            <p className="text-slate-500 font-medium text-xs leading-relaxed mb-6">
              {language === "fr" ? "Bonjour" : "Hello"} <strong>{session?.user?.name || "Utilisateur"}</strong>. {t.blocked.desc1} {t.blocked.desc2}
            </p>

            {blockedReason && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-left animate-in fade-in duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center flex-shrink-0 border border-rose-200">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <h4 className="font-bold text-rose-800">
                      {language === "fr" ? "Accès Suspendu / Bloqué" : "Access Suspended / Blocked"}
                    </h4>
                    <p className="text-[10px] text-rose-700/80 font-medium leading-relaxed">
                      {blockedReason === "TRIAL_EXPIRED" && (language === "fr" 
                        ? "Votre période d'essai gratuit a expiré. Veuillez vous abonner à une formule ci-dessous pour continuer à utiliser l'application." 
                        : "Your free trial period has expired. Please subscribe to a plan below to continue using the application.")}
                      {blockedReason === "LICENSE_EXPIRED" && (language === "fr" 
                        ? "Votre licence d'utilisation est arrivée à expiration. Veuillez la renouveler ci-dessous." 
                        : "Your license has expired. Please renew it below.")}
                      {blockedReason === "SUSPENDED" && (language === "fr" 
                        ? "Votre abonnement a été suspendu par l'administrateur système ou suite à une résiliation." 
                        : "Your subscription has been suspended by the system administrator or due to termination.")}
                      {blockedReason === "LIMIT_USERS_EXCEEDED" && (language === "fr" 
                        ? "Vous avez dépassé la limite maximale d'utilisateurs autorisée par votre licence actuelle. Veuillez supprimer des utilisateurs ou demander un upgrade." 
                        : "You have exceeded the maximum users limit authorized by your current license. Please remove users or request an upgrade.")}
                      {blockedReason === "LIMIT_PRODUCTS_EXCEEDED" && (language === "fr" 
                        ? "Vous avez dépassé la limite maximale de produits enregistrés autorisée par votre licence actuelle. Veuillez archiver des produits ou demander un upgrade." 
                        : "You have exceeded the maximum products limit authorized by your current license. Please archive products or request an upgrade.")}
                      {blockedReason === "USER_INACTIVE" && (language === "fr" 
                        ? "Votre compte utilisateur a été désactivé par l'administrateur. Veuillez contacter le support." 
                        : "Your user account has been deactivated by the administrator. Please contact support.")}
                    </p>

                    {(blockedReason === "LIMIT_USERS_EXCEEDED" || blockedReason === "LIMIT_PRODUCTS_EXCEEDED" || blockedReason === "LICENSE_EXPIRED") && (
                      <button
                        onClick={async () => {
                          const requestSubject = `Demande d'upgrade — ${blockedReason}`;
                          const requestMessage = language === "fr"
                            ? `Bonjour, je souhaite demander une mise à niveau (upgrade) de ma licence. Mon espace est actuellement bloqué pour le motif suivant : ${blockedReason}. Merci d'avance.`
                            : `Hello, I would like to request an upgrade for my license. My workspace is currently blocked for the following reason: ${blockedReason}. Thank you.`;
                          
                          setLoading(true);
                          try {
                            const res = await fetch("/api/support/tickets", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                subject: requestSubject,
                                message: requestMessage,
                                priority: "URGENTE",
                              }),
                            });
                            if (res.ok) {
                              const resData = await res.json();
                              setActiveTicketId(resData.data.id);
                              setMessages(resData.data.messages || []);
                              setActiveTab("chat");
                            }
                          } catch (err) {
                            console.error("Error creating upgrade ticket", err);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
                      >
                        {language === "fr" ? "Demander une mise à niveau" : "Request Upgrade"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 mb-1">
                      {language === "fr" ? "Abonnement Express" : "Express Subscription"}
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      {language === "fr" 
                        ? "Sélectionnez une formule annuelle et payez par Orange Money ou Carte pour réactiver vos accès instantanément." 
                        : "Select an annual plan and pay via Orange Money or Credit Card to instantly restore your access."}
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
              <LogOut className="w-4 h-4" /> {t.nav.logout}
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
                {language === "fr" ? "1. Tarifs & Abonnements" : "1. Pricing & Subscriptions"}
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`text-xs font-black uppercase tracking-wider pb-5 pt-5 border-b-2 transition-all relative ${
                  activeTab === "chat" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                {language === "fr" ? "2. Assistance en direct" : "2. Live Support"}
                {messages.length > 0 && (
                  <span className="absolute top-3 -right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>
            </div>
            
            {activeTicketId && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                {language === "fr" ? "Discussion Active" : "Active Chat"}
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
                      <h2 className="text-xl font-black text-slate-900 mb-2">
                        {language === "fr" ? "Choisissez votre formule" : "Choose your plan"}
                      </h2>
                      <p className="text-slate-400 font-medium text-xs">
                        {language === "fr" 
                          ? "Trouvez le forfait parfait pour piloter les stocks et les ventes de votre commerce." 
                          : "Find the perfect package to drive your store's inventory and sales."}
                      </p>
                    </div>

                    <div className={`grid grid-cols-1 ${dbLicenses.length === 2 ? 'md:grid-cols-2' : dbLicenses.length >= 3 ? 'md:grid-cols-3' : ''} gap-6`}>
                      {licensesLoading ? (
                        <div className="col-span-full flex justify-center py-12">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : dbLicenses.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-400 text-sm font-medium">
                          {language === "fr" ? "Aucune formule disponible pour le moment." : "No plans available at the moment."}
                        </div>
                      ) : (
                        dbLicenses.map((lic: any, idx: number) => {
                          const isMiddle = dbLicenses.length >= 3 && idx === 1;
                          const isFree = lic.price === 0;
                          const formatPrice = (price: number) => price.toLocaleString("fr-FR");
                          const formatDuration = (days: number) => {
                            if (days >= 365) return language === "fr" ? `/ ${Math.round(days / 365)} an${Math.round(days / 365) > 1 ? 's' : ''}` : `/ ${Math.round(days / 365)} year${Math.round(days / 365) > 1 ? 's' : ''}`;
                            if (days >= 30) return language === "fr" ? `/ ${Math.round(days / 30)} mois` : `/ ${Math.round(days / 30)} month${Math.round(days / 30) > 1 ? 's' : ''}`;
                            return language === "fr" ? `/ ${days} jour${days > 1 ? 's' : ''}` : `/ ${days} day${days > 1 ? 's' : ''}`;
                          };

                          return (
                            <div 
                              key={lic.id} 
                              className={`bg-white rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between shadow-sm relative group hover:scale-[1.01] ${
                                isMiddle ? 'border-2 border-blue-600 shadow-md' : 'border border-slate-200 hover:border-slate-350'
                              }`}
                            >
                              {isMiddle && (
                                <span className="absolute top-0 right-6 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-md">
                                  {language === "fr" ? "Recommandé" : "Recommended"}
                                </span>
                              )}
                              <div>
                                <span className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md ${
                                  isMiddle ? 'text-blue-600 bg-blue-50' : isFree ? 'text-slate-400 bg-slate-100' : 'text-indigo-600 bg-indigo-50'
                                }`}>
                                  {lic.name}
                                </span>
                                <h3 className="text-lg font-black text-slate-800 mt-4">
                                  {lic.name}
                                </h3>
                                <div className="my-6">
                                  <span className="text-2xl font-black text-slate-900">{formatPrice(lic.price)} XAF</span>
                                  <span className="text-slate-400 text-xs font-semibold"> {formatDuration(lic.durationDays)}</span>
                                </div>
                                <ul className={`space-y-2 border-t pt-4 text-xs font-semibold text-slate-600 ${
                                  isMiddle ? 'border-blue-50' : 'border-slate-100'
                                }`}>
                                  <li className="flex items-center gap-2">✓ {lic.maxUsers} {language === "fr" ? "Utilisateurs max" : "Users max"}</li>
                                  <li className="flex items-center gap-2">
                                    {lic.maxProducts ? (
                                      <>✓ {lic.maxProducts.toLocaleString("fr-FR")} {language === "fr" ? "Produits max" : "Products max"}</>
                                    ) : (
                                      <>✓ {language === "fr" ? "Produits Illimités" : "Unlimited Products"}</>
                                    )}
                                  </li>
                                  {lic.canDownload ? (
                                    <li className="flex items-center gap-2">✓ {language === "fr" ? "Téléchargements activés" : "Downloads enabled"}</li>
                                  ) : (
                                    <li className="flex items-center gap-2 text-slate-400 line-through">✗ {language === "fr" ? "Téléchargements" : "Downloads"}</li>
                                  )}
                                </ul>
                              </div>
                              <button
                                onClick={() => setSelectedPlan({ name: lic.name, price: lic.price, label: lic.name })}
                                className={`w-full mt-8 py-3.5 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all ${
                                  isMiddle 
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20' 
                                    : 'bg-slate-900 hover:bg-black'
                                }`}
                              >
                                {language === "fr" ? `Choisir ${lic.name}` : `Choose ${lic.name}`}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  // Plan chosen, show Payment Gateways
                  <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
                    <button
                      onClick={() => { setSelectedPlan(null); setPaymentMethod(null); }}
                      className="text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest flex items-center gap-1"
                    >
                      {language === "fr" ? "← Retour aux forfaits" : "← Back to plans"}
                    </button>

                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                          {language === "fr" ? "Formule choisie" : "Selected Plan"}
                        </span>
                        <h3 className="text-base font-black text-slate-800">{selectedPlan.label}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-900">{selectedPlan.price.toLocaleString("fr-FR")} XAF</span>
                      </div>
                    </div>

                    {!paymentMethod ? (
                      // Choose automatic vs manual
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center my-4">
                          {language === "fr" ? "Moyen de paiement" : "Payment Method"}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            onClick={() => setPaymentMethod("auto")}
                            className="bg-white border border-slate-200 hover:border-blue-500 rounded-3xl p-6 text-center transition-all group flex flex-col items-center justify-center"
                          >
                            <CreditCard className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-105 transition-transform" />
                            <span className="text-xs font-black text-slate-800">
                              {language === "fr" ? "Paiement Automatique" : "Automatic Payment"}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 leading-normal">
                              {language === "fr" ? "Carte Bancaire - Activation immédiate" : "Credit Card - Immediate activation"}
                            </span>
                          </button>

                          <button
                            onClick={() => setPaymentMethod("manual")}
                            className="bg-white border border-slate-200 hover:border-blue-500 rounded-3xl p-6 text-center transition-all group flex flex-col items-center justify-center"
                          >
                            <PhoneCall className="w-8 h-8 text-emerald-600 mb-3 group-hover:scale-105 transition-transform" />
                            <span className="text-xs font-black text-slate-800">
                              {language === "fr" ? "Paiement Manuel" : "Manual Payment"}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 leading-normal">
                              {language === "fr" ? "Dépôt Orange Money - Validation admin" : "Orange Money Deposit - Admin validation"}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : paymentMethod === "auto" ? (
                      // Automatic payment checkout with Paayit
                      <form onSubmit={handleAutoPaymentSubmit} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-5">
                        <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-blue-600" /> {language === "fr" ? "Paiement Mobile Money Sécurisé" : "Secure Mobile Money Payment"}
                        </h3>

                        {autoPaying ? (
                          <div className="py-12 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-300">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                            <div>
                              <h4 className="text-sm font-black text-slate-800">
                                {language === "fr" ? "Attente de validation sur votre téléphone..." : "Waiting for phone validation..."}
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
                                {language === "fr" 
                                  ? `Une demande de retrait de **${selectedPlan.price.toLocaleString("fr-FR")} XAF** a été envoyée au numéro **${momoPhone}**. Saisissez votre code PIN pour valider.` 
                                  : `A debit request of **${selectedPlan.price.toLocaleString("fr-FR")} XAF** was sent to **${momoPhone}**. Enter your PIN to validate.`}
                              </p>
                              <div className="mt-6 flex justify-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (pollInterval) clearInterval(pollInterval);
                                    setAutoPaying(false);
                                  }}
                                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-all"
                                >
                                  {language === "fr" ? "Modifier / Annuler" : "Edit / Cancel"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Operator selector */}
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                {language === "fr" ? "Choisissez votre opérateur" : "Choose your operator"}
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={() => setMomoService("MTN")}
                                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                                    momoService === "MTN"
                                      ? "border-yellow-400 bg-yellow-50/30 ring-2 ring-yellow-400/50"
                                      : "border-slate-200 bg-white hover:border-slate-300"
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-black text-slate-950">
                                    MTN
                                  </div>
                                  <span className="text-xs font-black text-slate-800">MTN Mobile Money</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setMomoService("ORANGE")}
                                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                                    momoService === "ORANGE"
                                      ? "border-orange-550 bg-orange-50/20 ring-2 ring-orange-500/40"
                                      : "border-slate-200 bg-white hover:border-slate-300"
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-black text-white">
                                    OR
                                  </div>
                                  <span className="text-xs font-black text-slate-800">Orange Money</span>
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                {language === "fr" ? "Numéro de téléphone Mobile Money" : "Mobile Money phone number"}
                              </label>
                              <input
                                type="tel"
                                required
                                value={momoPhone}
                                onChange={(e) => setMomoPhone(e.target.value)}
                                placeholder="670 00 00 00"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                              />
                            </div>

                            {error && (
                              <p className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-100 p-3 rounded-xl">{error}</p>
                            )}

                            <button
                              type="submit"
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-300"
                            >
                              {language === "fr" ? "Initier le paiement" : "Initiate payment"} {selectedPlan.price.toLocaleString("fr-FR")} XAF
                            </button>
                          </>
                        )}
                      </form>
                    ) : (
                      // Manual Orange Money Payment Workflow
                      <form onSubmit={handleManualPaymentSubmit} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-5">
                        <div className="text-center p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                          <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2">
                            {language === "fr" ? "Instructions Dépôt Orange Money" : "Orange Money Deposit Instructions"}
                          </h4>
                          <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                            {language === "fr" 
                              ? `Veuillez effectuer un transfert Orange Money d'un montant de **${selectedPlan.price.toLocaleString("fr-FR")} XAF** au numéro ci-dessous :`
                              : `Please transfer Orange Money of amount **${selectedPlan.price.toLocaleString("fr-FR")} XAF** to the number below:`}
                          </p>
                          <div className="text-xl font-black text-emerald-950 my-2 select-all cursor-pointer" title="Copier le numéro">
                            699 259 366
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            {language === "fr" ? "Destinataire : Thabor Solution" : "Recipient: Thabor Solution"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                            {language === "fr" ? "Justificatif de paiement (Capture d'écran)" : "Payment Proof (Screenshot)"}
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
                                <span className="text-xs font-semibold text-slate-400">
                                  {language === "fr" ? "Fichier en cours de chargement..." : "File uploading..."}
                                </span>
                              </div>
                            ) : screenshotFile ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                <span className="text-xs font-bold text-slate-800">{screenshotFile.name}</span>
                                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-150">
                                  {language === "fr" ? "Justificatif chargé" : "Proof loaded"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Upload className="w-8 h-8 text-slate-400 group-hover:scale-105 transition-transform" />
                                <span className="text-xs font-bold text-slate-600">
                                  {language === "fr" ? "Sélectionnez ou glissez la capture d'écran" : "Select or drag the screenshot"}
                                </span>
                                <span className="text-[9px] text-slate-400 leading-normal">
                                  {language === "fr" ? "Fichiers PNG, JPG ou JPEG acceptés" : "PNG, JPG or JPEG files accepted"}
                                </span>
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
                              <span>{language === "fr" ? "Transmission en cours..." : "Transmission in progress..."}</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>{language === "fr" ? "Envoyer le justificatif à l'administrateur" : "Send proof to administrator"}</span>
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
                          {language === "fr" ? "Assistance Thabor Solution" : "Thabor Solution Support"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {language === "fr" ? "Flux en direct SSE activé" : "Live SSE flow enabled"}
                      </span>
                    </div>

                    {/* Chat message list container */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 h-[50vh]">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                          <p className="text-xs text-slate-400">
                            {language === "fr" ? "Connexion sécurisée en direct..." : "Secure live connection..."}
                          </p>
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
                        placeholder={language === "fr" ? "Écrivez un message ici..." : "Write a message here..."}
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

                    <h2 className="text-xl font-black text-slate-900 mb-2">
                      {language === "fr" ? "Entrer en contact" : "Get in Touch"}
                    </h2>
                    <p className="text-slate-500 font-medium text-xs leading-relaxed mb-8">
                      {language === "fr" 
                        ? "Laissez un message à l'administrateur système ci-dessous. Dès que vous validerez, une session de chat en direct s'ouvrira pour suivre votre demande de réactivation." 
                        : "Leave a message to the system administrator below. Once submitted, a live chat session will open to track your reactivation request."}
                    </p>

                    <form onSubmit={handleFirstMessageSubmit} className="space-y-4 text-left">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          {language === "fr" ? "Votre Message" : "Your Message"}
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                          rows={4}
                          placeholder={language === "fr" 
                            ? "Expliquez la situation ou posez votre question pour réactiver votre accès..." 
                            : "Explain the situation or ask your question to reactivate your access..."}
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
                            <span>{language === "fr" ? "Connexion en cours..." : "Connecting..."}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{language === "fr" ? "Envoyer et Ouvrir le Chat" : "Send & Open Chat"}</span>
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
