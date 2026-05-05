"use client";
// src/app/(dashboard)/rapports/page.tsx
import { useState } from "react";
import { 
  FileText, 
  Download, 
  BarChart3, 
  Package, 
  Users, 
  TrendingUp, 
  ArrowRight,
  Loader2,
  Calendar
} from "lucide-react";
import { downloadReport } from "@/lib/utils";
import { useUIStore } from "@/stores/useUIStore";

interface ReportCardProps {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

export default function RapportsPage() {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const reports: ReportCardProps[] = [
    {
      id: "inventory",
      title: "Rapport d'Inventaire",
      description: "État actuel des stocks, valeurs d'achat et de vente, et alertes de stock bas.",
      icon: Package,
      color: "blue"
    },
    {
      id: "sales",
      title: "Rapport des Ventes",
      description: "Analyse détaillée des ventes, produits les plus vendus et marges bénéficiaires.",
      icon: TrendingUp,
      color: "green"
    },
    {
      id: "finance",
      title: "État Financier",
      description: "Résumé des revenus, dépenses et solde global des caisses.",
      icon: BarChart3,
      color: "purple"
    },
    {
      id: "customers",
      title: "Fiche Clients",
      description: "Liste des clients, balance de crédit et historique des transactions.",
      icon: Users,
      color: "orange"
    }
  ];

  const handleDownload = async (id: string, format: "excel" | "word" | "pdf") => {
    const key = `${id}-${format}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      await downloadReport({ type: id, format }, `rapport_${id}_${new Date().toISOString().split('T')[0]}`);
      addToast({ type: "success", title: "Téléchargement terminé", message: "Le rapport a été généré avec succès." });
    } catch (error: any) {
      console.error("Download error:", error);
      addToast({ 
        type: "error", 
        title: "Erreur", 
        message: error.message || "Impossible de générer le rapport pour le moment." 
      });
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Rapports & Statistiques</h1>
        <p className="text-gray-500">Générez et téléchargez des rapports détaillés sur votre activité.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-[2rem] shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden group border border-transparent">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={`p-3 rounded-2xl bg-${report.color}-50 text-${report.color}-600 group-hover:scale-110 transition-transform`}>
                    <report.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-gray-900">{report.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{report.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Mis à jour en temps réel
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDownload(report.id, "excel")}
                    disabled={loading[`${report.id}-excel`]}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {loading[`${report.id}-excel`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Excel
                  </button>
                  <button 
                    onClick={() => handleDownload(report.id, "word")}
                    disabled={loading[`${report.id}-word`]}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {loading[`${report.id}-word`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Word
                  </button>
                  <button 
                    onClick={() => handleDownload(report.id, "pdf")}
                    disabled={loading[`${report.id}-pdf`]}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {loading[`${report.id}-pdf`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-white shadow-md rounded-[2rem] p-8 flex gap-6 items-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-amber-400"></div>
        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:rotate-12 transition-transform">
          <ArrowRight className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900">Besoin d'un rapport personnalisé ?</h4>
          <p className="text-sm text-amber-700 mt-1">Vous pouvez demander des rapports spécifiques (par employé, par catégorie de stock, etc.) en contactant l'administrateur système.</p>
        </div>
      </div>
    </div>
  );
}
