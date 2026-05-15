// src/app/(dashboard)/superadmin/paiements/page.tsx
"use client";

import { CreditCard, CheckCircle, ExternalLink, Filter } from "lucide-react";

export default function AdminPaymentsPage() {
  // Demo data for payment validation
  const payments = [
    { id: "FLW-123", tenant: "Thabor Merchant Demo", amount: 50000, date: "2026-05-12", status: "PENDING", gateway: "Flutterwave" },
    { id: "FLW-124", tenant: "Global Store", amount: 150000, date: "2026-05-11", status: "SUCCESS", gateway: "Flutterwave" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-blue-600" />
          Validation des Paiements
        </h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all">
          <Filter className="w-4 h-4" /> Filtrer
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Transaction</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Marchand</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      {p.id} <ExternalLink className="w-3 h-3 text-slate-300" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{p.gateway}</span>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-600">{p.tenant}</td>
                  <td className="p-4 text-sm font-black text-slate-800">{p.amount.toLocaleString()} F</td>
                  <td className="p-4 text-sm text-slate-500 font-medium">{p.date}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${
                      p.status === "SUCCESS" ? "bg-green-50 text-green-600 border-green-100" : "bg-amber-50 text-amber-600 border-amber-100"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {p.status === "PENDING" && (
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all">
                        <CheckCircle className="w-3 h-3" /> Valider
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900">Information Intégration Flutterwave</h4>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            Les paiements reçus via Flutterwave sont automatiquement détectés. Cette interface vous permet de forcer la validation manuelle en cas de litige ou de virement bancaire direct.
          </p>
        </div>
      </div>
    </div>
  );
}
