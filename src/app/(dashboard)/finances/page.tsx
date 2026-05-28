"use client";
// src/app/(dashboard)/finances/page.tsx
import React, { useState, useEffect } from "react";
import { useTransactions, useCreateTransaction, useCashAccounts, useCreateCashAccount, useUpdateCashAccount, useOhadaAccounts, useCreateOhadaAccount } from "@/hooks/useQueries";
import { useUIStore } from "@/stores/useUIStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, Plus, RefreshCw, ArrowUpCircle, ArrowDownCircle, X, Settings, Edit, CheckCircle, ArrowRightLeft, BookOpen, Layers, BarChart3, HelpCircle } from "lucide-react";
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
  const { data: ohadaData } = useOhadaAccounts();
  const ohadaAccounts = ohadaData?.data || [];
  const { addToast } = useUIStore();
  
  const [type, setType] = useState<"RECETTE" | "DEPENSE">("RECETTE");
  const [showAdvancedOhada, setShowAdvancedOhada] = useState(false);

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
      title: language === "fr" ? "Transaction & Double-entrée OHADA enregistrées" : "Transaction & OHADA Double-entry saved" 
    });
    onClose();
  };

  const categories = type === "RECETTE" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Filtrer les comptes OHADA
  const cashOhadaOptions = ohadaAccounts
    .filter((a: any) => String(a.code).startsWith("5"))
    .map((a: any) => ({ value: a.id, label: `${a.code} - ${a.name}` }));

  const categoryOhadaOptions = ohadaAccounts
    .filter((a: any) => type === "RECETTE" ? String(a.code).startsWith("7") : String(a.code).startsWith("6"))
    .map((a: any) => ({ value: a.id, label: `${a.code} - ${a.name}` }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">{t.finances.modal.title}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto flex-1">
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
              <label className="label">{language === "fr" ? "Compte de trésorerie *" : "Cash Account *"}</label>
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

          {/* Accordéon OHADA Avancé */}
          <div className="border border-blue-100 rounded-xl bg-blue-50/30 p-3.5 space-y-2">
            <button 
              type="button" 
              onClick={() => setShowAdvancedOhada(!showAdvancedOhada)}
              className="flex items-center justify-between w-full text-left text-xs font-bold uppercase tracking-wider text-blue-900"
            >
              <span>⚙️ {language === "fr" ? "Comptabilité OHADA Avancée" : "Advanced OHADA Accounting"}</span>
              <span className="text-xs text-blue-500">{showAdvancedOhada ? "Masquer ▲" : "Afficher ▼"}</span>
            </button>
            
            {showAdvancedOhada ? (
              <div className="space-y-3 pt-2 animate-in fade-in-50 duration-200">
                <p className="text-[10px] text-gray-400 leading-normal">
                  {language === "fr" 
                    ? "Par défaut, l'application associe automatiquement les comptes Débit / Crédit basés sur la catégorie commerciale. Vous pouvez ici forcer des comptes comptables différents."
                    : "By default, the application maps Debit / Credit accounts based on commercial category. You can override it here."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-[10px] uppercase font-bold text-gray-400">{language === "fr" ? "Compte de Débit" : "Debit Account"}</label>
                    <Controller
                      name="debitAccountId"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={ohadaAccounts.map((a: any) => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={language === "fr" ? "Auto-déterminé..." : "Auto-determined..."}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="label text-[10px] uppercase font-bold text-gray-400">{language === "fr" ? "Compte de Crédit" : "Credit Account"}</label>
                    <Controller
                      name="creditAccountId"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={ohadaAccounts.map((a: any) => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={language === "fr" ? "Auto-déterminé..." : "Auto-determined..."}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-blue-700/70 italic">
                {language === "fr" ? "└ Les écritures de double-entrée OHADA seront générées automatiquement." : "└ OHADA double-entry lines will be automatically balanced."}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
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
            <p className="text-xs text-gray-505 mt-1">Créez, modifiez et activez/désactivez les comptes financiers de la structure.</p>
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
                        <div className="flex items-center gap-4 text-xs text-gray-505">
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

  const [activeTab, setActiveTab] = useState<"TRESO" | "JOURNAL" | "GRAND_LIVRE" | "BALANCE">("TRESO");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [activeOhadaAccountForLedger, setActiveOhadaAccountForLedger] = useState<any>(null);

  const { data, isLoading, isFetching, refetch } = useTransactions({ type: typeFilter });
  const { data: accountData } = useCashAccounts({ all: isAdminOrSuper });
  const { data: ohadaData, isLoading: isLoadingOhada } = useOhadaAccounts();

  const transactions = data?.data || [];
  const summary = data?.summary;
  const accounts = accountData?.data || [];
  const ohadaAccounts = ohadaData?.data || [];

  // Calculs d'équilibres pour la balance des comptes
  const totalDebitSum = ohadaAccounts.reduce((sum: number, a: any) => sum + a.totalDebit, 0);
  const totalCreditSum = ohadaAccounts.reduce((sum: number, a: any) => sum + a.totalCredit, 0);
  const totalDebitBalance = ohadaAccounts.reduce((sum: number, a: any) => a.soldeType === "DEBITEUR" ? sum + a.solde : sum, 0);
  const totalCreditBalance = ohadaAccounts.reduce((sum: number, a: any) => a.soldeType === "CREDITEUR" ? sum + a.solde : sum, 0);

  const isBalanced = Math.abs(totalDebitSum - totalCreditSum) < 0.1;

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📊 {t.finances.title}
          </h1>
          <p className="text-gray-500 text-sm">
            {activeTab === "TRESO" 
              ? `${transactions.length} transaction(s)` 
              : activeTab === "JOURNAL" 
              ? `${transactions.length * 2} écritures comptables` 
              : `${ohadaAccounts.length} comptes OHADA actifs`}
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

      {/* Barre d'onglets premium style glassmorphism */}
      <div className="flex border-b border-gray-100 bg-white p-1 rounded-2xl shadow-sm gap-1">
        <button 
          onClick={() => setActiveTab("TRESO")} 
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all ${activeTab === "TRESO" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Wallet className="w-4 h-4" />
          <span>{language === "fr" ? "Trésorerie & Caisses" : "Cash & Treasury"}</span>
        </button>
        <button 
          onClick={() => setActiveTab("JOURNAL")} 
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all ${activeTab === "JOURNAL" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{language === "fr" ? "Journal Général OHADA" : "OHADA General Journal"}</span>
        </button>
        <button 
          onClick={() => setActiveTab("GRAND_LIVRE")} 
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all ${activeTab === "GRAND_LIVRE" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Layers className="w-4 h-4" />
          <span>{language === "fr" ? "Grand Livre" : "General Ledger"}</span>
        </button>
        <button 
          onClick={() => setActiveTab("BALANCE")} 
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all ${activeTab === "BALANCE" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{language === "fr" ? "Balance des Comptes" : "Trial Balance"}</span>
        </button>
      </div>

      {/* RENDU TAB 1 : TRESORERIE standard */}
      {activeTab === "TRESO" && (
        <div className="space-y-5">
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
                <div key={acc.id} className="card p-4 border border-gray-100 hover:shadow-md transition-all relative overflow-hidden bg-white">
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
              <div className="card p-4 border-l-4 border-l-green-500 bg-white">
                <p className="text-sm text-gray-500">{language === "fr" ? "Total recettes" : "Total income"}</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(summary.totalRecettes)}</p>
              </div>
              <div className="card p-4 border-l-4 border-l-red-500 bg-white">
                <p className="text-sm text-gray-500">{language === "fr" ? "Total dépenses" : "Total expenses"}</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(summary.totalDepenses)}</p>
              </div>
              <div className="card p-4 border-l-4 border-l-blue-500 bg-white">
                <p className="text-sm text-gray-500">{language === "fr" ? "Solde net" : "Net balance"}</p>
                <p className={`text-xl font-bold ${summary.solde >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(summary.solde)}</p>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="card p-4 bg-white">
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
          <div className="table-container bg-white rounded-2xl shadow-sm border">
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
        </div>
      )}

      {/* RENDU TAB 2 : JOURNAL GENERAL OHADA (Double entrée) */}
      {activeTab === "JOURNAL" && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚖️</span>
              <div>
                <h4 className="text-sm font-bold text-emerald-950">{language === "fr" ? "Conformité du Journal Comptable" : "Ledger Audit Conformity"}</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {language === "fr" 
                    ? "Toutes les écritures de ce journal respectent strictement le principe de double-entrée du droit OHADA. Le débit total correspond exactement au crédit total."
                    : "All records strictly adhere to the OHADA double-entry standard. Total debits equal total credits."}
                </p>
              </div>
            </div>
            {isBalanced ? (
              <span className="text-xs bg-emerald-500 text-white font-black px-3 py-1 rounded-full uppercase shadow-sm">Équilibré</span>
            ) : (
              <span className="text-xs bg-rose-500 text-white font-black px-3 py-1 rounded-full uppercase shadow-sm">Écart détecté</span>
            )}
          </div>

          <div className="table-container bg-white rounded-2xl shadow-sm border">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-28">{language === "fr" ? "Date" : "Date"}</th>
                  <th className="w-32">{language === "fr" ? "Référence" : "Reference"}</th>
                  <th className="w-28">{language === "fr" ? "N° Compte" : "Account Code"}</th>
                  <th>{language === "fr" ? "Intitulé du compte (OHADA)" : "OHADA Account Name"}</th>
                  <th className="text-right w-36">{language === "fr" ? "Débit" : "Debit"}</th>
                  <th className="text-right w-36">{language === "fr" ? "Crédit" : "Credit"}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading || isLoadingOhada ? (
                  <TableLoading colSpan={6} />
                ) : transactions.length === 0 ? (
                  <TableEmpty colSpan={6} message={language === "fr" ? "Aucune écriture comptable dans le journal" : "No entries found in journal"} icon={BookOpen} />
                ) : transactions.map((tVal: any) => {
                  return (
                    <React.Fragment key={tVal.id}>
                      {/* LIGNE DE DEBIT */}
                      <tr className="hover:bg-blue-50/20">
                        <td className="text-xs text-gray-500 font-medium whitespace-nowrap">{formatDate(tVal.date)}</td>
                        <td className="text-xs font-mono text-gray-400">{tVal.reference || `TX-${tVal.id.slice(-6)}`}</td>
                        <td className="text-sm font-black text-blue-700">{tVal.debitAccount?.code || "—"}</td>
                        <td className="text-sm font-semibold text-gray-800">{tVal.debitAccount?.name || "—"}</td>
                        <td className="font-bold text-right text-green-700">{formatCurrency(tVal.amount)}</td>
                        <td className="text-gray-300 text-right">—</td>
                      </tr>
                      {/* LIGNE DE CREDIT */}
                      <tr className="hover:bg-orange-50/10 border-b border-gray-100">
                        <td className="text-xs"></td>
                        <td className="text-xs"></td>
                        <td className="text-sm font-black text-orange-700 pl-4">{tVal.creditAccount?.code || "—"}</td>
                        <td className="text-sm text-gray-500 italic pl-6 flex items-center gap-1">
                          <span>└</span>
                          <span>{tVal.creditAccount?.name || "—"}</span>
                        </td>
                        <td className="text-gray-300 text-right">—</td>
                        <td className="font-bold text-right text-orange-700">{formatCurrency(tVal.amount)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENDU TAB 3 : GRAND LIVRE */}
      {activeTab === "GRAND_LIVRE" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Liste des comptes OHADA */}
          <div className="md:col-span-1 space-y-3 bg-white p-4 border rounded-2xl shadow-sm max-h-[70vh] overflow-y-auto">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">{language === "fr" ? "Sélectionner un Compte" : "Select an Account"}</h3>
            {isLoadingOhada ? (
              <div className="py-10 text-center text-xs text-gray-400">Chargement...</div>
            ) : ohadaAccounts.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">Aucun compte</div>
            ) : ohadaAccounts.map((acc: any) => {
              const isSelected = activeOhadaAccountForLedger?.id === acc.id;
              const hasActivity = acc.totalDebit > 0 || acc.totalCredit > 0;
              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    // Trouver le détail des transactions du compte
                    const debited = transactions.filter((t: any) => t.debitAccountId === acc.id);
                    const credited = transactions.filter((t: any) => t.creditAccountId === acc.id);
                    setActiveOhadaAccountForLedger({
                      ...acc,
                      debited,
                      credited
                    });
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex flex-col gap-1.5 ${
                    isSelected 
                      ? "bg-blue-50 border-blue-300 text-blue-900 shadow-sm" 
                      : "bg-white border-gray-100 hover:border-gray-300"
                  } ${!hasActivity ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm">{acc.code}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                      isSelected ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"
                    }`}>
                      Classe {acc.class}
                    </span>
                  </div>
                  <span className="font-semibold truncate max-w-44 block">{acc.name}</span>
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mt-1 border-t pt-1">
                    <span>D: {formatCurrency(acc.totalDebit)}</span>
                    <span>C: {formatCurrency(acc.totalCredit)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Affichage en "T" Comptable pour le compte sélectionné */}
          <div className="md:col-span-3 space-y-4">
            {activeOhadaAccountForLedger ? (
              <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{activeOhadaAccountForLedger.code} — {activeOhadaAccountForLedger.name}</h2>
                    <p className="text-xs text-gray-500 mt-1">Grand Livre — Écritures de double-entrée OHADA</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Solde Actuel</span>
                    <span className={`text-2xl font-black ${
                      activeOhadaAccountForLedger.soldeType === "DEBITEUR" ? "text-green-700" : "text-orange-700"
                    }`}>
                      {formatCurrency(activeOhadaAccountForLedger.solde)} ({activeOhadaAccountForLedger.soldeType.slice(0, 3)}.)
                    </span>
                  </div>
                </div>

                {/* Le fameux compte en T d'école comptable */}
                <div className="grid grid-cols-2 border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                  {/* COTE DEBIT (Gauche) */}
                  <div className="border-r border-gray-300 flex flex-col">
                    <div className="bg-green-50 text-green-900 border-b border-gray-300 p-3.5 font-black uppercase text-center tracking-wider text-xs">
                      Débit
                    </div>
                    <div className="p-3 divide-y flex-1 max-h-[40vh] overflow-y-auto font-mono text-xs">
                      {activeOhadaAccountForLedger.debited?.length === 0 ? (
                        <div className="text-gray-400 text-center py-10 italic">Aucune écriture au débit</div>
                      ) : activeOhadaAccountForLedger.debited.map((t: any) => (
                        <div key={t.id} className="py-2.5 flex justify-between items-center hover:bg-gray-50/60 px-1">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-gray-500 font-semibold">{formatDate(t.date)}</span>
                            <span className="text-gray-800 text-xs truncate max-w-32">{t.description || t.category}</span>
                          </div>
                          <span className="font-bold text-green-700">{formatCurrency(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50/50 p-3.5 border-t border-gray-300 flex justify-between items-center font-bold text-xs font-mono">
                      <span>TOTAL DEBIT:</span>
                      <span className="text-green-700 text-sm font-black">{formatCurrency(activeOhadaAccountForLedger.totalDebit)}</span>
                    </div>
                  </div>

                  {/* COTE CREDIT (Droite) */}
                  <div className="flex flex-col">
                    <div className="bg-orange-50 text-orange-900 border-b border-gray-300 p-3.5 font-black uppercase text-center tracking-wider text-xs">
                      Crédit
                    </div>
                    <div className="p-3 divide-y flex-1 max-h-[40vh] overflow-y-auto font-mono text-xs">
                      {activeOhadaAccountForLedger.credited?.length === 0 ? (
                        <div className="text-gray-400 text-center py-10 italic">Aucune écriture au crédit</div>
                      ) : activeOhadaAccountForLedger.credited.map((t: any) => (
                        <div key={t.id} className="py-2.5 flex justify-between items-center hover:bg-gray-50/60 px-1">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-gray-500 font-semibold">{formatDate(t.date)}</span>
                            <span className="text-gray-800 text-xs truncate max-w-32">{t.description || t.category}</span>
                          </div>
                          <span className="font-bold text-orange-700">{formatCurrency(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50/50 p-3.5 border-t border-gray-300 flex justify-between items-center font-bold text-xs font-mono">
                      <span>TOTAL CREDIT:</span>
                      <span className="text-orange-700 text-sm font-black">{formatCurrency(activeOhadaAccountForLedger.totalCredit)}</span>
                    </div>
                  </div>
                </div>

                {/* Synthèse comptable */}
                <div className="p-4 rounded-xl border bg-gray-50/40 text-xs text-gray-600 leading-relaxed font-mono">
                  💡 <strong>Principe de calcul :</strong> La classe <strong>{activeOhadaAccountForLedger.class}</strong> a un 
                  { [2, 3, 5, 6].includes(activeOhadaAccountForLedger.class) 
                    ? " solde débiteur naturel (Débit - Crédit)." 
                    : " solde créditeur naturel (Crédit - Débit)." }
                  Si le solde résultant est négatif, il est automatiquement converti dans le type de solde opposé.
                </div>
              </div>
            ) : (
              <div className="bg-white border rounded-2xl shadow-sm p-12 text-center flex flex-col items-center justify-center gap-4 text-gray-400 py-32">
                <HelpCircle className="w-16 h-16 text-gray-300 animate-bounce" />
                <div>
                  <h3 className="font-black text-gray-800 text-base">{language === "fr" ? "Consulter le Grand Livre" : "Consult Ledger"}</h3>
                  <p className="text-xs text-gray-400 max-w-sm mt-1">{language === "fr" ? "Sélectionnez un compte comptable dans la liste de gauche pour visualiser ses écritures de Débit et de Crédit." : "Select an account from the left list to view debit and credit entries."}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDU TAB 4 : BALANCE DES COMPTES */}
      {activeTab === "BALANCE" && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <h4 className="text-sm font-bold text-blue-950">{language === "fr" ? "Balance de Vérification des Comptes" : "Verification Trial Balance"}</h4>
                <p className="text-xs text-blue-800 mt-0.5">
                  {language === "fr" 
                    ? "La balance récapitule l'ensemble du Plan Comptable. Elle est l'outil indispensable avant l'édition des états financiers OHADA (Bilan & Compte de Résultat)."
                    : "The trial balance aggregates the chart of accounts, essential for producing OHADA financial statements."}
                </p>
              </div>
            </div>
          </div>

          <div className="table-container bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-32">{language === "fr" ? "Code Compte" : "Account Code"}</th>
                  <th>{language === "fr" ? "Intitulé du compte" : "Account Name"}</th>
                  <th className="text-right w-36 bg-gray-50/50">{language === "fr" ? "Total Débit" : "Total Debit"}</th>
                  <th className="text-right w-36 bg-gray-50/50">{language === "fr" ? "Total Crédit" : "Total Credit"}</th>
                  <th className="text-right w-36 font-bold">{language === "fr" ? "Solde Débiteur" : "Debit Balance"}</th>
                  <th className="text-right w-36 font-bold">{language === "fr" ? "Solde Créditeur" : "Credit Balance"}</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingOhada ? (
                  <TableLoading colSpan={6} />
                ) : ohadaAccounts.length === 0 ? (
                  <TableEmpty colSpan={6} message={language === "fr" ? "Aucun compte comptable configuré" : "No account found"} icon={Wallet} />
                ) : (
                  <>
                    {ohadaAccounts.map((acc: any) => {
                      const hasActivity = acc.totalDebit > 0 || acc.totalCredit > 0;
                      return (
                        <tr key={acc.id} className={`hover:bg-gray-50/30 ${!hasActivity ? "opacity-40" : ""}`}>
                          <td className="font-black text-sm text-gray-900">{acc.code}</td>
                          <td className="text-sm font-semibold text-gray-700">{acc.name}</td>
                          <td className="text-right font-mono text-gray-600 bg-gray-50/50">{formatCurrency(acc.totalDebit)}</td>
                          <td className="text-right font-mono text-gray-600 bg-gray-50/50">{formatCurrency(acc.totalCredit)}</td>
                          <td className="text-right font-mono font-bold text-green-700">
                            {acc.soldeType === "DEBITEUR" ? formatCurrency(acc.solde) : "—"}
                          </td>
                          <td className="text-right font-mono font-bold text-orange-700">
                            {acc.soldeType === "CREDITEUR" ? formatCurrency(acc.solde) : "—"}
                          </td>
                        </tr>
                      );
                    })}

                    {/* LIGNE DE TOTALISATION DE LA BALANCE */}
                    <tr className="bg-blue-50/60 border-t-2 border-blue-200 font-bold text-blue-950 font-mono text-sm">
                      <td colSpan={2} className="text-center font-black uppercase py-4">Total Général Balance</td>
                      <td className="text-right text-green-700 font-black">{formatCurrency(totalDebitSum)}</td>
                      <td className="text-right text-orange-700 font-black">{formatCurrency(totalCreditSum)}</td>
                      <td className="text-right text-green-700 font-black border-l border-blue-200">{formatCurrency(totalDebitBalance)}</td>
                      <td className="text-right text-orange-700 font-black">{formatCurrency(totalCreditBalance)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Banner de validation de balance */}
          {isBalanced && totalDebitSum > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-100 animate-pulse border border-emerald-400">
              <CheckCircle className="w-5 h-5 text-white" />
              <span>⚖️ {language === "fr" ? "L'ÉQUILIBRE ARITHMÉTIQUE DU PLAN OHADA EST COMPLÈTEMENT RESPECTÉ !" : "THE OHADA ARITHMETIC BALANCE IS PERFECTLY COMPLIANT !"}</span>
            </div>
          )}
        </div>
      )}

      {showForm && <TransactionForm onClose={() => setShowForm(false)} accounts={accounts} />}
      {showManageAccounts && <ManageAccountsModal onClose={() => setShowManageAccounts(false)} accounts={accounts} />}
    </div>
  );
}
