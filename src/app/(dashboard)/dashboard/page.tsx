"use client";
// src/app/(dashboard)/dashboard/page.tsx
import { useDashboard } from "@/hooks/useQueries";
import { formatCurrency, formatDate, getInvoiceStatusBadge, getInvoiceStatusLabel } from "@/lib/utils";
import {
  Package, AlertTriangle, TrendingUp, Wallet, FileText,
  ShoppingCart, RefreshCw, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

function StatCard({ title, value, sub, icon: Icon, color = "blue", trend }: any) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="card p-5">
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

export default function DashboardPage() {
  const { data, isLoading, refetch } = useDashboard();
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
          <p className="text-gray-500">Chargement du tableau de bord…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-0.5">Bienvenue — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <button onClick={() => refetch()} disabled={isLoading} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Produits actifs" value={stats?.totalProducts || 0} icon={Package} color="blue" sub="en catalogue" />
        <StatCard title="Alertes stock" value={stats?.alertCount || 0} icon={AlertTriangle} color={stats?.alertCount > 0 ? "red" : "green"} sub={`${stats?.ruptures || 0} ruptures`} />
        <StatCard title="CA du mois" value={formatCurrency(stats?.monthRevenue || 0)} icon={TrendingUp} color="green" trend={stats?.revenueTrend} />
        <StatCard title="Valeur du stock" value={formatCurrency(stats?.totalStockValue || 0)} icon={Wallet} color="purple" sub="prix d'achat" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Factures du jour" value={stats?.todayInvoices || 0} icon={FileText} color="blue" sub={formatCurrency(stats?.todaySales || 0)} />
        <StatCard title="Factures en attente" value={stats?.pendingInvoices || 0} icon={FileText} color="yellow" sub="non soldées" />
        <StatCard title="Commandes actives" value="—" icon={ShoppingCart} color="blue" />
        <StatCard title="Bénéfice du mois" value={formatCurrency((stats?.monthRevenue || 0) - (stats?.monthExpenses || 0))} icon={TrendingUp} color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Évolution CA & Dépenses (6 mois)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="recettes" name="Recettes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="depenses" name="Dépenses" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent invoices */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Dernières factures</h3>
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
              <p className="text-sm text-gray-400 text-center py-8">Aucune facture récente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
