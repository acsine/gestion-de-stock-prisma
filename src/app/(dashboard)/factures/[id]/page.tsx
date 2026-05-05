"use client";

import { useParams, useRouter } from "next/navigation";
import { useInvoice, useAddPayment } from "@/hooks/useQueries";
import { formatCurrency, formatDate, getInvoiceStatusBadge, getInvoiceStatusLabel, downloadReport } from "@/lib/utils";
import { useUIStore } from "@/stores/useUIStore";
import { 
  ArrowLeft, Printer, Download, Mail, RefreshCw, 
  CreditCard, Calendar, User, FileText, Package, 
  CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { addToast } = useUIStore();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const { data, isLoading, error } = useInvoice(id);
  const invoice = data?.data as any;

  const { mutateAsync: addPayment, isPending: isPaying } = useAddPayment();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("ESPECES");

  const [showSendModal, setShowSendModal] = useState(false);

  const handleDownload = async (format: "pdf" | "word") => {
    setDownloading(format);
    try {
      await downloadReport({ type: "invoice", format, invoiceId: id }, `facture-${invoice?.number}`);
      addToast({ type: "success", title: `Facture téléchargée (${format.toUpperCase()})` });
    } catch {
      addToast({ type: "error", title: "Erreur lors du téléchargement" });
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-500">Chargement de la facture...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="card p-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Facture non trouvée</h2>
        <p className="text-gray-500 mt-2">Le document que vous recherchez n'existe pas ou a été supprimé.</p>
        <button onClick={() => router.back()} className="btn-primary mt-6 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    );
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addPayment({
        invoiceId: id,
        amount: paymentAmount,
        method: paymentMethod,
      });
      addToast({ type: "success", title: "Paiement enregistré" });
      setShowPaymentModal(false);
    } catch {
      addToast({ type: "error", title: "Erreur lors du paiement" });
    }
  };

  const isPaid = invoice.status === "PAYE";
  const isOverdue = !isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date();

  // Sharing logic
  const shareMessage = `Bonjour ${invoice.customer?.name},\n\nVoici votre facture ${invoice?.number} d'un montant de ${formatCurrency(invoice?.total || 0)}.\n\nStatut: ${getInvoiceStatusLabel(invoice?.status || "")}\nDate: ${formatDate(invoice?.issueDate || new Date())}\n\nCordialement,`;
  const shareSubject = `Facture ${invoice?.number} - ${invoice?.customer?.name}`;

  const shareLinks = {
    whatsapp: `https://wa.me/${invoice?.customer?.phone?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(shareMessage)}`,
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${invoice?.customer?.email || ""}&su=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareMessage)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(shareMessage)}`,
    yahoo: `https://compose.mail.yahoo.com/?to=${invoice?.customer?.email || ""}&subj=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareMessage)}`,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.number}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getInvoiceStatusBadge(invoice.status)}`}>
                {getInvoiceStatusLabel(invoice.status)}
              </span>
            </div>
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">{invoice.type}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleDownload("pdf")} 
            disabled={!!downloading}
            className="btn-secondary flex items-center gap-2 text-sm min-w-[140px]"
          >
            {downloading === "pdf" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Imprimer PDF
          </button>
          <button 
            onClick={() => handleDownload("word")} 
            disabled={!!downloading}
            className="btn-secondary flex items-center gap-2 text-sm min-w-[100px]"
          >
            {downloading === "word" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Word
          </button>
          <button onClick={() => setShowSendModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4" /> Envoyer
          </button>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-blue-600 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="w-6 h-6" /> Envoyer la facture</h2>
              <button onClick={() => setShowSendModal(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                <RefreshCw className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "whatsapp", name: "WhatsApp", icon: "💬", color: "green", link: shareLinks.whatsapp },
                  { id: "gmail", name: "Gmail", icon: "📧", color: "red", link: shareLinks.gmail },
                  { id: "telegram", name: "Telegram", icon: "✈️", color: "blue", link: shareLinks.telegram },
                  { id: "yahoo", name: "Yahoo", icon: "🟣", color: "purple", link: shareLinks.yahoo },
                ].map((p) => (
                  <ShareButton key={p.id} p={p} />
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aperçu du message</label>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap font-mono text-[10px]">
                  {shareMessage}
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => {
                    setCopying(true);
                    navigator.clipboard.writeText(shareMessage);
                    addToast({ type: "success", title: "Copié dans le presse-papier" });
                    setTimeout(() => setCopying(false), 500);
                  }}
                  disabled={copying}
                  className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                >
                  {copying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Copier le texte brut
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Invoice Summary */}
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Détails des articles
              </h3>
              <p className="text-sm text-gray-500">{(invoice.items?.length || 0)} article(s)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-gray-500 uppercase text-[10px] tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-4 py-4 text-center">Qté</th>
                    <th className="px-4 py-4 text-right">P.U</th>
                    <th className="px-4 py-4 text-center">Remise</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.product?.name || item.description}</div>
                        {item.product?.sku && <div className="text-[10px] text-gray-400 font-mono">{item.product.sku}</div>}
                      </td>
                      <td className="px-4 py-4 text-center font-medium">{item.quantity}</td>
                      <td className="px-4 py-4 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-4 text-center text-gray-500">{item.discount}%</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="p-6 bg-gray-50/30 border-t border-gray-100">
              <div className="flex flex-col items-end space-y-2">
                <div className="flex justify-between w-64 text-sm">
                  <span className="text-gray-500">Sous-total HT</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm text-red-600">
                  <span>Remise Globale ({invoice.discount}%)</span>
                  <span>-{formatCurrency(invoice.subtotal * (invoice.discount / 100))}</span>
                </div>
                <div className="flex justify-between w-64 text-sm">
                  <span className="text-gray-500">TVA (19.25%)</span>
                  <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between w-64 pt-3 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Total TTC</span>
                  <span className="text-2xl font-black text-blue-700">{formatCurrency(invoice.total)}</span>
                </div>
                
                <div className="flex justify-between w-64 pt-3 mt-3 border-t border-dashed border-gray-200 text-sm">
                  <span className="text-gray-500">Montant payé</span>
                  <span className="font-bold text-green-600">{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm">
                  <span className="text-gray-500">Reste à payer</span>
                  <span className="font-bold text-orange-600">{formatCurrency(invoice.total - invoice.paidAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Timeline (if applicable) */}
          <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" /> Historique des paiements
            </h3>
            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="space-y-4">
                {invoice.payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-medium">{payment.method} — {formatDate(payment.paidAt)}</p>
                      </div>
                    </div>
                    {payment.reference && <span className="text-[10px] font-mono bg-white px-2 py-1 rounded border border-gray-200">{payment.reference}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400 italic">Aucun paiement enregistré</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className={`card p-6 border-l-4 ${isPaid ? "border-l-green-500" : isOverdue ? "border-l-red-500" : "border-l-blue-500"}`}>
            <div className="flex items-center gap-3 mb-4">
              {isPaid ? (
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : isOverdue ? (
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Statut du paiement</p>
                <p className="font-bold text-gray-900">
                  {isPaid ? "Document Soldé" : isOverdue ? "En retard de paiement" : "En attente de règlement"}
                </p>
              </div>
            </div>
            {!isPaid && (
              <button 
                onClick={() => {
                  setPaymentAmount(invoice.total - invoice.paidAmount);
                  setShowPaymentModal(true);
                }}
                className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" /> Enregistrer un paiement
              </button>
            )}
          </div>

          {/* Payment Modal */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-5 bg-blue-600 text-white flex items-center justify-between">
                  <h2 className="text-xl font-bold">Enregistrer un paiement</h2>
                  <button onClick={() => setShowPaymentModal(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                    <RefreshCw className="w-6 h-6 rotate-45" />
                  </button>
                </div>
                <form onSubmit={handleAddPayment} className="p-6 space-y-4">
                  <div>
                    <label className="label">Montant à payer</label>
                    <input 
                      type="number" 
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(Number(e.target.value))} 
                      className="input text-lg font-bold"
                      max={invoice.total - invoice.paidAmount}
                    />
                  </div>
                  <div>
                    <label className="label">Mode de paiement</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
                      <option value="ESPECES">Espèces</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="VIREMENT">Virement</option>
                    </select>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 btn-secondary">Annuler</button>
                    <button type="submit" disabled={isPaying} className="flex-1 btn-primary flex items-center justify-center gap-2">
                      {isPaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Valider le paiement
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Client Details */}
          <div className="card p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Client
            </h3>
            <div className="space-y-3">
              <p className="font-bold text-gray-900 text-lg">{invoice.customer?.name}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-4 text-gray-400">📞</span> {invoice.customer?.phone || "Non renseigné"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-4 text-gray-400">📧</span> {invoice.customer?.email || "Pas d'email"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-4 text-gray-400">📍</span> {invoice.customer?.address || "Adresse non définie"}
                </div>
              </div>
              <Link 
                href={`/clients/${invoice.customerId}`} 
                className="block text-center text-xs text-blue-600 hover:underline pt-2"
              >
                Voir la fiche client complète
              </Link>
            </div>
          </div>

          {/* Dates Card */}
          <div className="card p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Dates clés
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Date d'émission</p>
                <p className="text-sm font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Date d'échéance</p>
                <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : ""}`}>
                  {invoice.dueDate ? formatDate(invoice.dueDate) : "Non définie"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Enregistré par</p>
                <p className="text-sm font-medium">{invoice.user?.name || "Utilisateur inconnu"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareButton({ p }: { p: any }) {
  const [isOpening, setIsOpening] = useState(false);
  
  return (
    <button 
      onClick={() => {
        setIsOpening(true);
        setTimeout(() => {
          window.open(p.link, "_blank");
          setIsOpening(false);
        }, 800);
      }}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
        p.color === "green" ? "border-green-100 bg-green-50 hover:bg-green-100 text-green-700" :
        p.color === "red" ? "border-red-100 bg-red-50 hover:bg-red-100 text-red-700" :
        p.color === "blue" ? "border-blue-100 bg-blue-50 hover:bg-blue-100 text-blue-700" :
        "border-purple-100 bg-purple-50 hover:bg-purple-100 text-purple-700"
      }`}
    >
      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center relative">
        {isOpening ? (
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        ) : (
          <span className="text-2xl">{p.icon}</span>
        )}
      </div>
      <span className="font-bold">{p.name}</span>
    </button>
  );
}
