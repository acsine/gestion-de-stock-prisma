"use client";
// src/app/(dashboard)/finances/page.tsx
import { useState } from "react";
import { useTransactions, useCreateTransaction, useCashAccounts, useCreateCashAccount, useUpdateCashAccount } from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, Plus, RefreshCw, ArrowUpCircle, ArrowDownCircle, X, Settings, Edit, CheckCircle, XCircle } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionInput } from "@/lib/validations";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TableLoading, TableEmpty } from "@/components/ui/TableStates";
import { useTranslation } from "@/locales/i18n";
import { useSession } from "next-auth/react";

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
                    options={accounts.filter((a) => a.isActive).map((a) => ({ value: a.id, label: a.name, sub: formatCurrency(a.balance) }))}
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

function ManageAccountsModal({ onClose, accounts }: { onClose: () => void; accounts: any[] }) {
  const { language } = useTranslation();
  const { mutateAsync: createAccount, isPending: isCreating } = useCreateCashAccount();
  const { mutateAsync: updateAccount } = useUpdateCashAccount();
  const { addToast } = useUIStore();

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"CAISSE" | "BANQUE" | "MOBILE_MONEY">("CAISSE");
  const [newBalance, setNewBalance] = useState("0");
  const [newCurrency, setNewCurrency] = useState("XAF");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"CAISSE" | "BANQUE" | "MOBILE_MONEY">("CAISSE");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      addToast({ type: "error", title: "Erreur", message: "Le nom est requis" });
      return;
    }
    const res = await createAccount({
      name: newName,
      type: newType,
      balance: parseFloat(newBalance || "0"),
      currency: newCurrency,
    });
    if (res.error) {
      addToast({ type: "error", title: "Erreur", message: res.error });
      return;
    }
    addToast({ type: "success", title: "Succès", message: "Compte créé avec succès" });
    setNewName("");
    setNewBalance("0");
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const res = await updateAccount({ id, data: { isActive: !currentStatus } });
    if (res.error) {
      addToast({ type: "error", title: "Erreur", message: res.error });
      return;
    }
    addToast({
      type: "success",
      title: "Succès",
      message: currentStatus ? "Compte désactivé" : "Compte activé",
    });
  };

  const handleStartEdit = (acc: any) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditType(acc.type);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      addToast({ type: "error", title: "Erreur", message: "Le nom ne peut pas être vide" });
      return;
    }
    const res = await updateAccount({ id, data: { name: editName, type: editType } });
    if (res.error) {
      addToast({ type: "error", title: "Erreur", message: res.error });
      return;
    }
    addToast({ type: "success", title: "Succès", message: "Compte mis à jour" });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestion des Comptes & Caisses</h2>
            <p className="text-xs text-gray-500 mt-1">Créez, modifiez et activez/désactivez les comptes financiers de la structure.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* List of existing accounts */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Comptes Existants</h3>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
              {accounts.map((acc: any) => {
                const isEditing = editingId === acc.id;
                const badgeColor =
                  acc.type === "CAISSE"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : acc.type === "BANQUE"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-purple-50 text-purple-700 border-purple-200";

                return (
                  <div
                    key={acc.id}
                    className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all ${
                      acc.isActive ? "bg-white border-gray-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-70"
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <input
                          type="text"
                          className="input text-sm py-1.5"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nom du compte"
                        />
                        <select
                          className="input text-sm py-1.5"
                          value={editType}
                          onChange={(e: any) => setEditType(e.target.value)}
                        >
                          <option value="CAISSE">CAISSE (Espèces)</option>
                          <option value="MOBILE_MONEY">MOBILE MONEY</option>
                          <option value="BANQUE">BANQUE</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(acc.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold"
                          >
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs font-semibold"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{acc.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {acc.type}
                          </span>
                          {!acc.isActive && (
                            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                              Inactif
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Solde: <strong className="text-gray-900">{formatCurrency(acc.balance)}</strong></span>
                          <span>Devise: <strong className="text-gray-900">{acc.currency}</strong></span>
                        </div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(acc)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(acc.id, acc.isActive)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                            acc.isActive
                              ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                              : "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                          }`}
                        >
                          {acc.isActive ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Creation Form */}
          <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Nouveau Compte</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Nom du compte *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Caisse Principale, Orange Money..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Type de compte *</label>
                <select
                  className="input"
                  value={newType}
                  onChange={(e: any) => setNewType(e.target.value)}
                >
                  <option value="CAISSE">CAISSE (Espèces)</option>
                  <option value="MOBILE_MONEY">MOBILE MONEY</option>
                  <option value="BANQUE">BANQUE</option>
                </select>
              </div>

              <div>
                <label className="label">Solde Initial (FCFA) *</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="label">Devise</label>
                <input
                  type="text"
                  className="input"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                  placeholder="XAF"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 transition-all"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Créer le Compte</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinancesPage() {
  const { t, language } = useTranslation();
  const { data: session } = useSession();
  const isAdminOrSuper = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.isSuperAdmin;

  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showManageAccounts, setShowManageAccounts] = useState(false);

  const { data, isLoading, isFetching, refetch } = useTransactions({ type: typeFilter });
  const { data: accountData } = useCashAccounts({ all: isAdminOrSuper });

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
          {isAdminOrSuper && (
            <button onClick={() => setShowManageAccounts(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Settings className="w-4 h-4" />
              <span>Gérer les Caisses</span>
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> {t.finances.addBtn}
          </button>
        </div>
      </div>

      {/* Account balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {accounts.filter((acc: any) => acc.isActive).map((acc: any) => {
          const badgeColor =
            acc.type === "CAISSE"
              ? "border-green-200 text-green-700 bg-green-50/50"
              : acc.type === "BANQUE"
              ? "border-blue-200 text-blue-700 bg-blue-50/50"
              : "border-purple-200 text-purple-700 bg-purple-50/50";
          return (
            <div key={acc.id} className="card p-4 border border-gray-100 hover:shadow-md transition-all relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-505 font-bold uppercase">{acc.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                  {acc.type}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(acc.balance)}</p>
            </div>
          );
        })}
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
      {showManageAccounts && <ManageAccountsModal onClose={() => setShowManageAccounts(false)} accounts={accounts} />}
    </div>
  );
}
