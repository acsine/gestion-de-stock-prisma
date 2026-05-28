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
  Calendar,
  Layers,
  Filter,
  Trophy
} from "lucide-react";
import { downloadReport, formatCurrency, cn } from "@/lib/utils";
import { useUIStore } from "@/stores/useUIStore";
import { useTranslation } from "@/locales/i18n";
import { useBestSellers, useCategories } from "@/hooks/useQueries";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ReportCardProps {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

export default function RapportsPage() {
  const { t, language } = useTranslation();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Paramètres pour le filtre des produits les plus vendus
  const [periodPreset, setPeriodPreset] = useState("30"); // 1 (aujourd'hui), 7 (7j), 30 (30j), custom
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [metric, setMetric] = useState<"quantity" | "revenue">("quantity");

  // Fetch Categories & Best Sellers data
  const { data: catData } = useCategories();
  const categories = catData?.data || [];

  const { data: bestSellersData, isLoading: isLoadingSellers, isFetching: isFetchingSellers } = useBestSellers({
    startDate,
    endDate,
    categoryId: selectedCategoryId || undefined,
    metric,
    limit: 8
  });

  const bestSellers = bestSellersData?.data || [];

  const reports: ReportCardProps[] = [
    {
      id: "inventory",
      title: language === "fr" ? "Rapport d'Inventaire" : "Inventory Report",
      description: language === "fr" 
        ? "État actuel des stocks, valeurs d'achat et de vente, et alertes de stock bas." 
        : "Current stock levels, purchase and sales values, and low stock alerts.",
      icon: Package,
      color: "blue"
    },
    {
      id: "sales",
      title: language === "fr" ? "Rapport des Ventes" : "Sales Report",
      description: language === "fr" 
        ? "Analyse détaillée des ventes, produits les plus vendus et marges bénéficiaires." 
        : "Detailed sales analysis, top-selling products, and profit margins.",
      icon: TrendingUp,
      color: "green"
    },
    {
      id: "finance",
      title: language === "fr" ? "État Financier" : "Financial Statement",
      description: language === "fr" 
        ? "Résumé des revenus, dépenses et solde global des caisses." 
        : "Summary of revenues, expenses, and overall cash registers balance.",
      icon: BarChart3,
      color: "purple"
    },
    {
      id: "customers",
      title: language === "fr" ? "Fiche Clients" : "Customer Statement",
      description: language === "fr" 
        ? "Liste des clients, balance de crédit et historique des transactions." 
        : "List of customers, credit balance, and transaction history.",
      icon: Users,
      color: "orange"
    }
  ];

  const handlePeriodChange = (val: string) => {
    setPeriodPreset(val);
    if (val === "1") {
      const today = new Date().toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(today);
    } else if (val === "7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    } else if (val === "30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    }
  };

  const handleDownload = async (id: string, format: "excel" | "word" | "pdf") => {
    const key = `${id}-${format}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      await downloadReport({ type: id, format, startDate, endDate }, `rapport_${id}_${new Date().toISOString().split('T')[0]}`);
      addToast({
        type: "success",
        title: language === "fr" ? "Téléchargement terminé" : "Download complete",
        message: language === "fr" ? "Le rapport a été généré avec succès." : "The report has been generated successfully."
      });
    } catch (error: any) {
      console.error("Download error:", error);
      addToast({ 
        type: "error", 
        title: t.common.error, 
        message: error.message || (language === "fr" ? "Impossible de générer le rapport pour le moment." : "Unable to generate the report at this moment.")
      });
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Harmonious palette for chart bars
  const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#64748B"];

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          📊 {language === "fr" ? "Rapports & Statistiques" : "Reports & Statistics"}
        </h1>
        <p className="text-gray-500">
          {language === "fr" 
            ? "Générez des rapports d'activité officiels et analysez vos performances de ventes en temps réel." 
            : "Generate official business reports and analyze your sales performances in real-time."}
        </p>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group border border-gray-100 bg-white">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl transition-transform group-hover:scale-105",
                    report.color === "blue" ? "bg-blue-50 text-blue-600" :
                    report.color === "green" ? "bg-emerald-50 text-emerald-600" :
                    report.color === "purple" ? "bg-purple-50 text-purple-600" :
                    "bg-orange-50 text-orange-600"
                  )}>
                    <report.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-gray-900">{report.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{report.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {language === "fr" ? "Mis à jour en temps réel" : "Updated in real-time"}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDownload(report.id, "excel")}
                    disabled={loading[`${report.id}-excel`]}
                    className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {loading[`${report.id}-excel`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Excel
                  </button>
                  <button 
                    onClick={() => handleDownload(report.id, "word")}
                    disabled={loading[`${report.id}-word`]}
                    className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {loading[`${report.id}-word`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Word
                  </button>
                  <button 
                    onClick={() => handleDownload(report.id, "pdf")}
                    disabled={loading[`${report.id}-pdf`]}
                    className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
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

      {/* DASHBOARD BEST SELLERS */}
      <div className="bg-white rounded-[2rem] border shadow-sm p-6 space-y-6">
        {/* Header Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">{language === "fr" ? "🏆 Analyses de Performance : Top des Ventes" : "🏆 Sales Performance Analysis"}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{language === "fr" ? "Classement des produits les plus vendus selon la période et les filtres réseau" : "Ranking of best-selling products by period and custom parameters"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFetchingSellers && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Métrique : {metric}</span>
          </div>
        </div>

        {/* Filters Widget */}
        <div className="bg-slate-50 border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Preset Periode */}
          <div>
            <label className="label text-[10px] uppercase font-bold text-gray-400 mb-1 block">Période prédéfinie</label>
            <select 
              value={periodPreset} 
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="input text-xs py-2 bg-white"
            >
              <option value="30">30 derniers jours</option>
              <option value="7">7 derniers jours</option>
              <option value="1">Aujourd'hui</option>
              <option value="custom">Date personnalisée</option>
            </select>
          </div>

          {/* Date Range Fields */}
          <div className="sm:col-span-1 grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px] uppercase font-bold text-gray-400 mb-1 block">Du</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setPeriodPreset("custom"); }} 
                className="input text-xs py-2 bg-white" 
              />
            </div>
            <div>
              <label className="label text-[10px] uppercase font-bold text-gray-400 mb-1 block">Au</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setPeriodPreset("custom"); }} 
                className="input text-xs py-2 bg-white" 
              />
            </div>
          </div>

          {/* Categorie Filter */}
          <div>
            <label className="label text-[10px] uppercase font-bold text-gray-400 mb-1 block">Catégorie de produit</label>
            <select 
              value={selectedCategoryId} 
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="input text-xs py-2 bg-white"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Metric Sort */}
          <div>
            <label className="label text-[10px] uppercase font-bold text-gray-400 mb-1 block">Classer par</label>
            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              <button 
                type="button" 
                onClick={() => setMetric("quantity")}
                className={cn(
                  "py-2 px-3 text-xs font-bold rounded-xl transition-all border",
                  metric === "quantity" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                )}
              >
                Quantité
              </button>
              <button 
                type="button" 
                onClick={() => setMetric("revenue")}
                className={cn(
                  "py-2 px-3 text-xs font-bold rounded-xl transition-all border",
                  metric === "revenue" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                )}
              >
                Revenu
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Visualizer (Grid Chart / Table) */}
        {isLoadingSellers ? (
          <div className="text-center py-20 text-xs text-gray-400">Chargement des données analytiques...</div>
        ) : bestSellers.length === 0 ? (
          <div className="text-center py-16 text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2">
            <span>📭 Aucun produit vendu sur cette période.</span>
            <span className="text-[10px] text-gray-400">Vérifiez que vous avez validé des factures clients dans la section Ventes.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Chart Column (3/5) */}
            <div className="lg:col-span-3 space-y-2">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">📊 Graphique Comparatif (Top Best-Sellers)</h3>
              <div className="h-72 w-full border rounded-2xl p-4 bg-slate-50/50 shadow-sm flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bestSellers} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "#64748B", fontSize: 10, fontWeight: "bold" }} 
                      axisLine={false} 
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      tick={{ fill: "#64748B", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1E293B", color: "#F8FAFC", borderRadius: "12px", border: "none", fontSize: "11px" }}
                      formatter={(value) => [metric === "revenue" ? formatCurrency(Number(value)) : `${value} unités`, metric === "revenue" ? "Revenu" : "Quantité"]}
                    />
                    <Bar 
                      dataKey={metric === "revenue" ? "revenueGenerated" : "quantitySold"} 
                      radius={[8, 8, 0, 0]}
                    >
                      {bestSellers.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table Column (2/5) */}
            <div className="lg:col-span-2 space-y-2">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">📋 Liste des performances de ventes</h3>
              <div className="border rounded-2xl overflow-hidden shadow-sm bg-white divide-y max-h-[38vh] overflow-y-auto">
                {bestSellers.map((item: any, index: number) => {
                  return (
                    <div key={item.productId} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/40">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]",
                          index === 0 ? "bg-amber-100 text-amber-800" :
                          index === 1 ? "bg-slate-100 text-slate-800" :
                          index === 2 ? "bg-orange-100 text-orange-800" :
                          "bg-gray-100 text-gray-500"
                        )}>
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-bold text-gray-800 block truncate max-w-44">{item.name}</span>
                          <span className="text-[9px] text-gray-400 font-semibold">{item.category} | SKU: {item.sku}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="text-gray-900 block font-mono font-bold text-xs">
                          {metric === "revenue" ? formatCurrency(item.revenueGenerated) : `${item.quantitySold} ${item.unit}`}
                        </strong>
                        <span className="text-[9px] text-gray-400 italic">
                          {metric === "revenue" ? `${item.quantitySold} soldes` : formatCurrency(item.revenueGenerated)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-white shadow-sm rounded-[2rem] p-6 border flex gap-4 items-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-amber-400"></div>
        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:rotate-12 transition-transform">
          <ArrowRight className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900">
            {language === "fr" ? "Besoin d'un rapport personnalisé ?" : "Need a custom report?"}
          </h4>
          <p className="text-xs text-amber-700 leading-normal mt-0.5">
            {language === "fr" 
              ? "Vous pouvez exporter des analyses encore plus fines par employé, caissier, ou sous-entrepôt en programmant un rapport personnalisé avec le support client." 
              : "Export refined reports by specific cash registers or sub-warehouses by scheduling with client support."}
          </p>
        </div>
      </div>
    </div>
  );
}
