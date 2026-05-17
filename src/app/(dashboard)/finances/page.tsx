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

const EXPENSE_CATEGORIES = ["Achats marchandises","Loyer","Salaires","Eau/Électricité","Transport","Téléphone/Internet","Fournitures bureau","Taxes et impôts","Maintenance","Autre dépense"];
const INCOME_CATEGORIES = ["Ventes produits","Prestation de services","Acompte client","Subvention","Remboursement","Autre recette"];

function TransactionForm({ onClose, accounts }: { onClose: () => void; accounts: any[] }) {
  const { mutateAsync, isPending } = useCreateTransaction();
  const { addToast } = useUIStore();
  const [type, setType] = useState<"RECETTE" | "DEPENSE">("RECETTE");
  const { register, handleSubmit, control, formState: { errors } } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: "RECETTE", date: new Date().toISOString().split("T")[0] },
  });

  const onSubmit = async (data: TransactionInput) => {
    const res = await mutateAsync({ ...data, type });
    if (res.error) { addToast({ type: "error", title: "Erreur", message: typeof res.error === "string" ? res.error : "Erreur" }); return; }
    addToast({ type: "success", title: "Transaction enregistrée" });
    onClose();
  };

  const categories = type === "RECETTE" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">Nouvelle transaction</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["RECETTE", "DEPENSE"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`py-2.5 rounded-lg font-medium text-sm transition-all ${type === t ? (t === "RECETTE" ? "bg-green-600 text-white" : "bg-red-600 text-white") : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t === "RECETTE" ? "✚ Recette" : "✖ Dépense"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Montant (FCFA) *</label>
              <input {...register("amount", { valueAsNumber: true })} type="number" min="1" className="input" placeholder="0" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Compte *</label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={accounts.map((a) => ({ value: a.id, label: a.name, sub: formatCurrency(a.balance) }))}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Sélectionner…"
                    searchPlaceholder="Rechercher un compte…"
                  />
                )}
              />
              {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Catégorie *</label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={categories.map((c) => ({ value: c, label: c }))}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Sélectionner…"
                  searchPlaceholder="Rechercher une catégorie…"
                />
              )}
            />
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input {...register("date")} type="date" className="input" />
            </div>
            <div>
              <label className="label">Référence</label>
              <input {...register("reference")} className="input" placeholder="N° reçu, facture…" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register("description")} className="input h-16 resize-none" placeholder="Détail optionnel…" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button 
              type="submit" 
              disabled={isPending} 
              className="btn-primary flex items-center justify-center gap-2 min-w-[120px] transition-all disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion financière</h1>
          <p className="text-gray-500 text-sm">{data?.total || 0} transaction(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary p-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nouvelle transaction
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
            <p className="text-sm text-gray-500">Total recettes</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(summary.totalRecettes)}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-red-500">
            <p className="text-sm text-gray-500">Total dépenses</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(summary.totalDepenses)}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-gray-500">Solde net</p>
            <p className={`text-xl font-bold ${summary.solde >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(summary.solde)}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card p-4">
        <SearchableSelect
          options={[
            { value: "RECETTE", label: "Recettes uniquement" },
            { value: "DEPENSE", label: "Dépenses uniquement" }
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder="Toutes les transactions"
          allowAll
          allLabel="Toutes les transactions"
          className="w-64"
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th><th>Type</th><th>Catégorie</th><th>Compte</th><th>Référence</th><th>Description</th><th>Montant</th><th>Par</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={8} />
            ) : transactions.length === 0 ? (
              <TableEmpty colSpan={8} message="Aucune transaction trouvée" icon={Wallet} />
            ) : transactions.map((t: any) => (
              <tr key={t.id}>
                <td className="text-xs text-gray-500">{formatDate(t.date)}</td>
                <td>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${t.type === "RECETTE" ? "text-green-700" : "text-red-700"}`}>
                    {t.type === "RECETTE" ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                    {t.type}
                  </span>
                </td>
                <td className="text-sm">{t.category}</td>
                <td className="text-sm text-gray-500">{t.account?.name}</td>
                <td className="text-xs font-mono text-gray-400">{t.reference || "—"}</td>
                <td className="text-xs text-gray-500 max-w-40 truncate">{t.description || "—"}</td>
                <td className={`font-bold text-right ${t.type === "RECETTE" ? "text-green-700" : "text-red-700"}`}>
                  {t.type === "RECETTE" ? "+" : "-"}{formatCurrency(t.amount)}
                </td>
                <td className="text-xs text-gray-400">{t.user?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} accounts={accounts} />}
    </div>
  );
}
