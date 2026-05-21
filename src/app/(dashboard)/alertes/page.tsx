"use client";
// src/app/(dashboard)/alertes/page.tsx
import { useAlerts } from "@/hooks/useQueries";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/locales/i18n";
import { Bell, AlertTriangle, AlertOctagon, TrendingDown, RefreshCw } from "lucide-react";

const alertIcons: Record<string, any> = {
  RUPTURE: AlertOctagon,
  STOCK_CRITIQUE: AlertTriangle,
  STOCK_BAS: TrendingDown,
  SURSTOCK: Bell,
  PEREMPTION: AlertTriangle,
};

const alertColors: Record<string, string> = {
  RUPTURE: "border-l-red-600 bg-red-50",
  STOCK_CRITIQUE: "border-l-red-400 bg-red-50",
  STOCK_BAS: "border-l-yellow-500 bg-yellow-50",
  SURSTOCK: "border-l-blue-500 bg-blue-50",
  PEREMPTION: "border-l-orange-500 bg-orange-50",
};

export default function AlertesPage() {
  const { t, language } = useTranslation();
  const { data, isLoading, refetch } = useAlerts();
  const alerts = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.alertes.title}</h1>
          <p className="text-gray-500 text-sm">
            {alerts.length} {t.alertes.activeAlerts}
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />{t.actions.refresh}
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : alerts.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t.alertes.noAlerts}</p>
          <p className="text-sm mt-1">{t.alertes.normalLevels}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => {
            const Icon = alertIcons[alert.type] || Bell;
            return (
              <div key={alert.id} className={`card border-l-4 p-4 ${alertColors[alert.type] || ""}`}>
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-700" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{alert.product?.name}</span>
                      <span className="text-xs text-gray-500 font-mono">{alert.product?.sku}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{alert.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{t.alertes.currentStock} <strong>{alert.product?.currentStock} {alert.product?.unit}</strong></span>
                      <span>{formatDate(alert.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${alert.type === "RUPTURE" ? "bg-red-600 text-white" : alert.type.includes("CRITIQUE") ? "badge-red" : "badge-yellow"}`}>
                    {language === "fr"
                      ? alert.type.replace(/_/g, " ")
                      : alert.type === "RUPTURE"
                      ? "Shortage"
                      : alert.type === "STOCK_CRITIQUE"
                      ? "Critical Stock"
                      : alert.type === "STOCK_BAS"
                      ? "Low Stock"
                      : alert.type === "SURSTOCK"
                      ? "Overstock"
                      : alert.type === "PEREMPTION"
                      ? "Expiration"
                      : alert.type.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
