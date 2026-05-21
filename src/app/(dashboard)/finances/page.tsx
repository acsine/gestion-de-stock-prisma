"use client";
// src/app/(dashboard)/finances/page.tsx
import { useState } from "react";
import { useTransactions, useCreateTransaction, useCashAccounts } from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, Plus, RefreshCw, ArrowUpCircle, ArrowDownCircle, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionInput } from "@/lib/validations";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";
import { useTranslation } from "@/locales/i18n";

const EXPENSE_CATEGORIES = ["Achats marchandises","Loyer","Salaires","Eau/Électricité","Transport","Téléphone/Internet","Fournitures bureau","Taxes et impôts","Maintenance","Autre dépense"];
const INCOME_CATEGORIES = ["Ventes produits","Prestation de services","Acompte client","Subvention","Remboursement","Autre recette"];

const translateCategory = (c: string, lang: string) => {
  if (lang === "fr") return c;
  const mapping: Record<string, string> = {
    "Achats marchandises": "Goods purchase",
    "Loyer": "Rent",
    "Salaires": "Salaries",
    "Eau/Électricité": "Water/Electricity",
    "Transport": "Transportation",
    "Téléphone/Internet": "Phone/Internet",
    "Fournitures bureau": "Office Supplies",
    "Taxes et impôts": "Taxes & Duties",
    "Maintenance": "Maintenance",
    "Autre dépense": "Other expense",
    "Ventes produits": "Product Sales",
    "Prestation de services": "Services Rendered",
    "Acompte client": "Customer Deposit",
    "Subvention": "Grant/Subsidy",
    "Remboursement": "Refund",
    "Autre recette": "Other income"
  };
  return mapping[c] || c;
};

function TransactionForm({ onClose, accounts }: { onClose: () => void; accounts: any[] }) {
  const { t, language } = useTranslation();
  const { mutateAsync, isPending } = useCreateTransaction();
  const { addToast } = useUIStore();
  const [type, setType] = useState<"RECETTE" | "DEPENSE">("RECETTE");
  const { register, handleSubmit, control, formState: { errors } } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: "RECETTE", date: new Date().toISOString().split("T")[0] },
  });

  const onSubmit = async (data: TransactionInput) => {
    const res = await mutateAsync({ ...data, type });
    if (res.error) { 
      addToast({ 
        type: "error", 
        title: t.common.error, 
        message: typeof res.error === "string" ? res.error : t.common.error 
      }); 
      return; 
    }
    addToast({ 
      type: "success", 
      title: language === "fr" ? "Transaction enregistrée" : "Transaction saved" 
    });
    onClose();
  };

  const categories = type === "RECETTE" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">{t.finances.modal.title}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["RECETTE", "DEPENSE"] as const).map((tVal) => (
              <button key={tVal} type="button" onClick={() => setType(tVal)}
                className={`py-2.5 rounded-lg font-medium text-sm transition-all ${type === tVal ? (tVal === "RECETTE" ? "bg-green-600 text-white" : "bg-red-600 text-white") : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {tVal === "RECETTE" 
                  ? (language === "fr" ? "✚ Recette" : "✚ Income") 
                  : (language === "fr" ? "✖ Dépense" : "✖ Expense")}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{language === "fr" ? "Montant (FCFA) *" : "Amount (FCFA) *"}</label>
              <input {...register("amount", { valueAsNumber: true })} type="number" min="1" className="input" placeholder="0" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">{language === "fr" ? "Compte *" : "Account *"}</label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={accounts.map((a) => ({ value: a.id, label: a.name, sub: formatCurrency(a.balance) }))}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={language === "fr" ? "Sélectionner…" : "Select..."}
                    searchPlaceholder={language === "fr" ? "Rechercher un compte…" : "Search account..."}
                  />
                )}
              />
              {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">{t.finances.table.category} *</label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={categories.map((c) => ({ value: c, label: translateCategory(c, language) }))}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={language === "fr" ? "Sélectionner…" : "Select..."}
                  searchPlaceholder={language === "fr" ? "Rechercher une catégorie…" : "Search category..."}
                />
              )}
            />
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{language === "fr" ? "Date" : "Date"}</label>
              <input {...register("date")} type="date" className="input" />
            </div>
            <div>
              <label className="label">{language === "fr" ? "Référence" : "Reference"}</label>
              <input {...register("reference")} className="input" placeholder={language === "fr" ? "N° reçu, facture…" : "Receipt/Invoice No..."} />
            </div>
          </div>
          <div>
            <label className="label">{t.common.description}</label>
            <textarea {...register("description")} className="input h-16 resize-none" placeholder={language === "fr" ? "Détail optionnel…" : "Optional detail..."} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">{t.actions.cancel}</button>
            <button 
              type="submit" 
              disabled={isPending} 
              className="btn-primary flex items-center justify-center gap-2 min-w-[120px] transition-all disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.actions.saving}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{t.actions.save}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinancesPage() {
  const { t, language } = useTranslation();
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isFetching, refetch } = useTransactions({ type: typeFilter });
  const { data: accountData } = useCashAccounts();
  const transactions = data?.data || [];
  const summary = data?.summary;
  const accounts = accountData?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.finances.title}</h1>
          <p className="text-gray-500 text-sm">
            {data?.total || 0} {language === "fr" ? "transaction(s)" : "transaction(s)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> {t.finances.addBtn}
          </button>
        </div>
      </div>

      {/* Account balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {accounts.map((acc: any) => (
          <div key={acc.id} className="card p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">{acc.type} — {acc.name}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(acc.balance)}</p>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-gray-500">{language === "fr" ? "Total recettes" : "Total income"}</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(summary.totalRecettes)}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-red-500">
            <p className="text-sm text-gray-500">{language === "fr" ? "Total dépenses" : "Total expenses"}</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(summary.totalDepenses)}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-gray-500">{language === "fr" ? "Solde net" : "Net balance"}</p>
            <p className={`text-xl font-bold ${summary.solde >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(summary.solde)}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card p-4">
        <SearchableSelect
          options={[
            { value: "RECETTE", label: language === "fr" ? "Recettes uniquement" : "Income only" },
            { value: "DEPENSE", label: language === "fr" ? "Dépenses uniquement" : "Expenses only" }
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder={language === "fr" ? "Toutes les transactions" : "All transactions"}
          allowAll
          allLabel={language === "fr" ? "Toutes les transactions" : "All transactions"}
          className="w-64"
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t.finances.table.date}</th>
              <th>{t.finances.table.type}</th>
              <th>{t.finances.table.category}</th>
              <th>{t.finances.table.source}</th>
              <th>{language === "fr" ? "Référence" : "Reference"}</th>
              <th>{t.common.description}</th>
              <th>{t.finances.table.amount}</th>
              <th>{language === "fr" ? "Par" : "By"}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={8} />
            ) : transactions.length === 0 ? (
              <TableEmpty colSpan={8} message={language === "fr" ? "Aucune transaction trouvée" : "No transaction found"} icon={Wallet} />
            ) : transactions.map((tVal: any) => (
              <tr key={tVal.id}>
                <td className="text-xs text-gray-500">{formatDate(tVal.date)}</td>
                <td>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${tVal.type === "RECETTE" ? "text-green-700" : "text-red-700"}`}>
                    {tVal.type === "RECETTE" ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                    {tVal.type === "RECETTE" 
                      ? (language === "fr" ? "RECETTE" : "INCOME") 
                      : (language === "fr" ? "DEPENSE" : "EXPENSE")}
                  </span>
                </td>
                <td className="text-sm">{translateCategory(tVal.category, language)}</td>
                <td className="text-sm text-gray-500">{tVal.account?.name}</td>
                <td className="text-xs font-mono text-gray-400">{tVal.reference || "—"}</td>
                <td className="text-xs text-gray-500 max-w-40 truncate">{tVal.description || "—"}</td>
                <td className={`font-bold text-right ${tVal.type === "RECETTE" ? "text-green-700" : "text-red-700"}`}>
                  {tVal.type === "RECETTE" ? "+" : "-"}{formatCurrency(tVal.amount)}
                </td>
                <td className="text-xs text-gray-400">{tVal.user?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} accounts={accounts} />}
    </div>
  );
}
