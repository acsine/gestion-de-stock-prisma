"use client";
// src/app/(dashboard)/dashboard/page.tsx
import { useState, useEffect } from "react";
import { useDashboard } from "@/hooks/useQueries";
import { formatCurrency, formatDate, getInvoiceStatusBadge, getInvoiceStatusLabel, cn } from "@/lib/utils";
import { useTranslation } from "@/locales/i18n";
import {
  Package, AlertTriangle, TrendingUp, Wallet, FileText,
  ShoppingCart, RefreshCw, ArrowUpRight, ArrowDownRight, X, ArrowLeftRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function StatCard({ title, value, sub, icon: Icon, color = "blue", trend, onClick }: any) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div 
      onClick={onClick}
      className={cn(
        "card p-5 transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-xl hover:scale-[1.02] border border-blue-100/50 hover:border-blue-300 bg-white"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{title}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function MarginDetailModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/margin")
      .then((r) => r.json())
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const movements = data?.movements || [];

  const filteredMovements = movements.filter((m: any) => {
    const matchesSearch = (m.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.productSku || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "" || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const currentTotal = filteredMovements.reduce((sum: number, m: any) => sum + m.margin, 0);

  const MOVEMENT_LABELS: Record<string, string> = {
    SORTIE_VENTE: t.dashboard.marginModal.types.SORTIE_VENTE,
    ENTREE_RETOUR: t.dashboard.marginModal.types.ENTREE_RETOUR,
    SORTIE_PERTE: t.dashboard.marginModal.types.SORTIE_PERTE,
    SORTIE_USAGE_INTERNE: t.dashboard.marginModal.types.SORTIE_USAGE_INTERNE
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-sans">{t.dashboard.marginModal.title}</h2>
            <p className="text-xs text-gray-500 mt-1">{t.dashboard.marginModal.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200/70 text-gray-500 hover:text-gray-700 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Summary */}
        <div className="p-5 border-b border-gray-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{t.actions.search}</label>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="input text-sm bg-white" 
              placeholder={t.dashboard.marginModal.searchPlaceholder} 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{t.dashboard.marginModal.typeLabel}</label>
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)} 
              className="input text-sm bg-white"
            >
              <option value="">{t.dashboard.marginModal.allTypes}</option>
              <option value="SORTIE_VENTE">{t.dashboard.marginModal.salesOnly}</option>
              <option value="ENTREE_RETOUR">{t.dashboard.marginModal.returnsOnly}</option>
              <option value="SORTIE_PERTE">{t.dashboard.marginModal.lossesOnly}</option>
              <option value="SORTIE_USAGE_INTERNE">{t.dashboard.marginModal.internalOnly}</option>
            </select>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl flex flex-col justify-center h-full">
            <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">{t.dashboard.marginModal.filteredTotal}</span>
            <span className={cn(
              "text-lg font-black mt-0.5",
              currentTotal >= 0 ? "text-emerald-700" : "text-rose-700"
            )}>
              {formatCurrency(currentTotal)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm text-gray-500">{t.actions.loading}</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-16">
              <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">{t.dashboard.marginModal.noMovement}</p>
              <p className="text-xs text-gray-400 mt-1">{t.dashboard.marginModal.noMovementSub}</p>
            </div>
          ) : (
            <div className="table-container border rounded-xl overflow-hidden">
              <table className="data-table">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th>{t.dashboard.marginModal.table.date}</th>
                    <th>{t.dashboard.marginModal.table.product}</th>
                    <th>{t.dashboard.marginModal.table.type}</th>
                    <th>{t.dashboard.marginModal.table.qty}</th>
                    <th>{t.dashboard.marginModal.table.buyCost}</th>
                    <th>{t.dashboard.marginModal.table.sellPrice}</th>
                    <th>{t.dashboard.marginModal.table.unitMargin}</th>
                    <th>{t.dashboard.marginModal.table.totalMargin}</th>
                    <th>{t.dashboard.marginModal.table.by}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredMovements.map((m: any) => {
                    const unitMargin = m.type === "SORTIE_VENTE" ? (m.unitPrice - m.buyPrice) : 
                                       m.type === "ENTREE_RETOUR" ? -(m.unitPrice - m.buyPrice) : 
                                       -m.buyPrice;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                        <td>
                          <div className="font-semibold text-gray-900">{m.productName}</div>
                          <div className="text-xs text-gray-400 font-mono">{m.productSku}</div>
                        </td>
                        <td>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                            m.type === "SORTIE_VENTE" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            m.type === "ENTREE_RETOUR" ? "bg-blue-50 text-blue-700 border-blue-100" :
                            "bg-rose-50 text-rose-700 border-rose-100"
                          )}>
                            {MOVEMENT_LABELS[m.type] || m.type}
                          </span>
                        </td>
                        <td className="font-medium text-gray-900">{m.quantity} {m.productUnit}</td>
                        <td className="text-gray-500">{formatCurrency(m.buyPrice)}</td>
                        <td className="text-gray-500">
                          {["SORTIE_VENTE", "ENTREE_RETOUR"].includes(m.type) ? formatCurrency(m.unitPrice) : "—"}
                        </td>
                        <td className={cn(
                          "font-medium",
                          unitMargin > 0 ? "text-emerald-600" : unitMargin < 0 ? "text-rose-600" : "text-gray-500"
                        )}>
                          {unitMargin > 0 ? "+" : ""}{formatCurrency(unitMargin)}
                        </td>
                        <td>
                          <span className={cn(
                            "font-bold px-2 py-0.5 rounded-full text-xs border",
                            m.margin > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                            m.margin < 0 ? "bg-rose-50 text-rose-700 border-rose-200" : 
                            "bg-slate-50 text-slate-600 border-slate-200"
                          )}>
                            {m.margin > 0 ? "+" : ""}{formatCurrency(m.margin)}
                          </span>
                        </td>
                        <td className="text-xs text-gray-500 whitespace-nowrap">{m.user}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="btn-secondary px-5 py-2 font-bold rounded-xl text-sm">{t.actions.close}</button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, language } = useTranslation();
  const { data, isLoading, isFetching, refetch } = useDashboard();
  const [showMarginModal, setShowMarginModal] = useState(false);
  const stats = data?.data;

  const chartData = stats?.monthlyRevenue?.map((m: any) => ({
    name: m.month,
    recettes: m.revenue,
    depenses: m.expenses
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-500">{t.dashboard.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.title}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t.dashboard.welcome} — {new Date().toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          {t.actions.refresh}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t.dashboard.activeProducts} value={stats?.totalProducts || 0} icon={Package} color="blue" sub={t.dashboard.inCatalog} />
        <StatCard title={t.dashboard.stockAlerts} value={stats?.alertCount || 0} icon={AlertTriangle} color={stats?.alertCount > 0 ? "red" : "green"} sub={`${stats?.ruptures || 0} ${t.dashboard.ruptures}`} />
        <StatCard title={t.dashboard.monthlyRevenue} value={formatCurrency(stats?.monthRevenue || 0)} icon={TrendingUp} color="green" trend={stats?.revenueTrend} />
        <StatCard title={t.dashboard.stockValue} value={formatCurrency(stats?.totalStockValue || 0)} icon={Wallet} color="purple" sub={t.dashboard.buyPrice} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t.dashboard.todayInvoices} value={stats?.todayInvoices || 0} icon={FileText} color="blue" sub={formatCurrency(stats?.todaySales || 0)} />
        <StatCard title={t.dashboard.pendingInvoices} value={stats?.pendingInvoices || 0} icon={FileText} color="yellow" sub={t.dashboard.unpaid} />
        <StatCard 
          title={t.dashboard.movementMargin} 
          value={formatCurrency(stats?.movementMargin || 0)} 
          icon={TrendingUp} 
          color="green" 
          sub={t.dashboard.marginSub} 
          onClick={() => setShowMarginModal(true)} 
        />
        <StatCard title={t.dashboard.monthlyProfit} value={formatCurrency((stats?.monthRevenue || 0) - (stats?.monthExpenses || 0))} icon={TrendingUp} color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">{t.dashboard.evolutionChart}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="recettes" name={t.dashboard.revenue} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="depenses" name={t.dashboard.expenses} fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent invoices */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">{t.dashboard.recentInvoices}</h3>
          <div className="space-y-2">
            {(stats?.recentInvoices || []).slice(0, 5).map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.number}</p>
                  <p className="text-xs text-gray-500">{inv.customer?.name} — {formatDate(inv.issueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total)}</p>
                  <span className={`text-xs ${getInvoiceStatusBadge(inv.status)}`}>{getInvoiceStatusLabel(inv.status)}</span>
                </div>
              </div>
            ))}
            {(!stats?.recentInvoices || stats.recentInvoices.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-8">{t.dashboard.noRecentInvoices}</p>
            )}
          </div>
        </div>
      </div>

      {showMarginModal && <MarginDetailModal onClose={() => setShowMarginModal(false)} />}
    </div>
  );
}

