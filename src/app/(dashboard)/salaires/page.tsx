"use client";
// src/app/(dashboard)/salaires/page.tsx
import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePayrolls, useGeneratePayrolls, useTenants } from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency, downloadReport, MONTHS } from "@/lib/utils";
import { ClipboardList, Printer, RefreshCw, Wand2, Download } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useTranslation } from "@/locales/i18n";

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function SalairesPage() {
  const { t, language } = useTranslation();
  const { data: session } = useSession();
  const isSuper = (session?.user as any)?.isSuperAdmin || false;
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const { data: tenantsData } = useTenants();
  const tenants = tenantsData?.data || [];

  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { addToast } = useUIStore();

  const { data, isLoading, isFetching, refetch } = usePayrolls({ 
    month: parseInt(month), 
    year: parseInt(year),
    tenantId: isSuper ? selectedTenantId : undefined
  });
  const { mutateAsync: generate, isPending: generating } = useGeneratePayrolls();
  const payrolls = data?.data || [];

  const handleGenerate = async () => {
    if (isSuper && !selectedTenantId) {
      addToast({
        type: "error",
        title: t.common.error,
        message: language === "fr" ? "Veuillez sélectionner une entreprise." : "Please select a company."
      });
      return;
    }
    const res = await generate({ 
      month: parseInt(month), 
      year: parseInt(year),
      tenantId: isSuper ? selectedTenantId : undefined
    });
    if (res.error) {
      addToast({ type: "error", title: t.common.error, message: res.error });
    } else {
      addToast({
        type: "success",
        title: language === "fr" ? "Fiches générées avec succès !" : "Slips generated successfully!"
      });
    }
    refetch();
  };

  const handlePayslipPDF = async (payrollId: string, empName: string) => {
    setLoading(s => ({ ...s, [payrollId]: true }));
    try {
      await downloadReport({ 
        type: "payslip", 
        format: "pdf", 
        payrollId,
        ...(isSuper && selectedTenantId ? { tenantId: selectedTenantId } : {})
      }, `fiche-paie-${empName}`);
      addToast({
        type: "success",
        title: language === "fr" ? "Fiche de paie générée" : "Payslip generated"
      });
    } catch {
      addToast({
        type: "error",
        title: language === "fr" ? "Erreur de génération" : "Generation error"
      });
    } finally {
      setLoading(s => ({ ...s, [payrollId]: false }));
    }
  };

  const handleBulkExcel = async () => {
    if (isSuper && !selectedTenantId) {
      addToast({
        type: "error",
        title: t.common.error,
        message: language === "fr" ? "Veuillez sélectionner une entreprise." : "Please select a company."
      });
      return;
    }
    try {
      await downloadReport({ 
        type: "payroll", 
        format: "excel", 
        month: String(month), 
        year: String(year),
        ...(isSuper && selectedTenantId ? { tenantId: selectedTenantId } : {})
      }, `salaires-${month}-${year}`);
      addToast({
        type: "success",
        title: language === "fr" ? "Export Excel téléchargé" : "Excel export downloaded"
      });
    } catch {
      addToast({
        type: "error",
        title: language === "fr" ? "Erreur d'export" : "Export error"
      });
    }
  };

  const totalNet = payrolls.reduce((s: number, p: any) => s + p.netSalary, 0);
  const totalBase = payrolls.reduce((s: number, p: any) => s + p.baseSalary, 0);

  const statusBadge: Record<string, string> = { BROUILLON: "badge-gray", VALIDE: "badge-blue", PAYE: "badge-green" };

  const monthsList = language === "fr" ? MONTHS : MONTHS_EN;
  const monthOptions = monthsList.map((m, i) => ({ value: String(i + 1), label: m }));
  const yearOptions = [2023, 2024, 2025, 2026].map((y) => ({ value: String(y), label: String(y) }));
  const tenantOptions = tenants.map((t: any) => ({ value: t.id, label: t.name }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === "fr" ? "Gestion des salaires" : "Salary Management"}
          </h1>
          <p className="text-gray-500 text-sm">
            {payrolls.length} {language === "fr" ? "fiche(s)" : "slip(s)"} — {language === "fr" ? "Masse salariale nette" : "Net payroll mass"} : {formatCurrency(totalNet)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleBulkExcel} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary flex items-center gap-2 text-sm">
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {language === "fr" ? "Générer les fiches" : "Generate slips"}
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {isSuper && (
            <div className="flex items-center gap-2 mr-3">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {language === "fr" ? "Entreprise :" : "Company:"}
              </span>
              <SearchableSelect
                options={tenantOptions}
                value={selectedTenantId}
                onChange={setSelectedTenantId}
                placeholder={language === "fr" ? "Choisir…" : "Choose..."}
                className="w-56"
              />
            </div>
          )}
          <label className="text-sm font-medium text-gray-700">
            {language === "fr" ? "Période :" : "Period:"}
          </label>
          <SearchableSelect
            options={monthOptions}
            value={month}
            onChange={setMonth}
            placeholder={language === "fr" ? "Mois" : "Month"}
            className="w-32"
          />
          <SearchableSelect
            options={yearOptions}
            value={year}
            onChange={setYear}
            placeholder={language === "fr" ? "Année" : "Year"}
            className="w-32"
          />
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        {payrolls.length > 0 && (
          <div className="flex items-center gap-6 ml-auto text-sm">
            <div>
              <span className="text-gray-500">
                {language === "fr" ? "Masse brute : " : "Gross mass: "}
              </span>
              <span className="font-semibold">{formatCurrency(totalBase)}</span>
            </div>
            <div>
              <span className="text-gray-500">
                {language === "fr" ? "Masse nette : " : "Net mass: "}
              </span>
              <span className="font-semibold text-green-700">{formatCurrency(totalNet)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{language === "fr" ? "Employé" : "Employee"}</th>
              <th>{language === "fr" ? "Poste" : "Position"}</th>
              <th>{language === "fr" ? "Salaire Base" : "Base Salary"}</th>
              <th>{language === "fr" ? "Primes" : "Bonuses"}</th>
              <th>{language === "fr" ? "Charges sociales" : "Social charges"}</th>
              <th>{language === "fr" ? "Retenues" : "Deductions"}</th>
              <th>{language === "fr" ? "Salaire Net" : "Net Salary"}</th>
              <th>{t.common.status}</th>
              <th>{t.actions.actions}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  {t.actions.loading}
                </td>
              </tr>
            ) : payrolls.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  {language === "fr" 
                    ? `Aucune fiche pour ${monthsList[parseInt(month) - 1]} ${year}. Cliquez sur "Générer les fiches".`
                    : `No slips for ${monthsList[parseInt(month) - 1]} ${year}. Click on "Generate slips".`}
                </td>
              </tr>
            ) : payrolls.map((p: any) => (
              <tr key={p.id}>
                <td className="font-medium">{p.employee.firstName} {p.employee.lastName}</td>
                <td className="text-gray-500 text-sm">{p.employee.position}</td>
                <td className="text-right">{formatCurrency(p.baseSalary)}</td>
                <td className="text-right text-green-700">{p.bonuses > 0 ? formatCurrency(p.bonuses) : "—"}</td>
                <td className="text-right text-orange-600">{formatCurrency(p.socialCharges)}</td>
                <td className="text-right text-red-600">{p.deductions > 0 ? formatCurrency(p.deductions) : "—"}</td>
                <td className="text-right font-bold text-blue-700">{formatCurrency(p.netSalary)}</td>
                <td>
                  <span className={`text-xs ${statusBadge[p.status] || "badge-gray"}`}>
                    {p.status === "PAYE" 
                      ? (language === "fr" ? "Payé" : "Paid") 
                      : p.status === "VALIDE" 
                      ? (language === "fr" ? "Validé" : "Validated") 
                      : (language === "fr" ? "Brouillon" : "Draft")}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handlePayslipPDF(p.id, `${p.employee.firstName}-${p.employee.lastName}`)}
                    disabled={loading[p.id]}
                    title={language === "fr" ? "Imprimer fiche de paie PDF" : "Print PDF payslip"}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors disabled:opacity-50"
                  >
                    {loading[p.id] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
