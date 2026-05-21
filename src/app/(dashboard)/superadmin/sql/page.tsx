// src/app/(dashboard)/superadmin/sql/page.tsx
"use client";

import { useState } from "react";
import { executeRawSql } from "@/app/actions/admin-actions";
import { Database, Play, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/locales/i18n";

export default function SqlConsolePage() {
  const { t, language } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    console.log("SQL Console: Starting execution...", { query });
    if (!query.trim()) {
      console.log("SQL Console: Query is empty, skipping.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log("SQL Console: Calling executeRawSql...");
      const res = await executeRawSql(query);
      console.log("SQL Console: Response received:", res);
      if (res.success) {
        setResults(Array.isArray(res.data) ? res.data : [{ result: res.data }]);
      } else {
        setError(res.error || (language === "fr" ? "Une erreur est survenue" : "An error occurred"));
      }
    } catch (err: any) {
      console.error("SQL Console: Fatal error:", err);
      setError(err.message || (language === "fr" ? "Erreur d'exécution" : "Execution error"));
    } finally {
      console.log("SQL Console: Execution finished.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          {language === "fr" ? "Console SQL (Maintenance)" : "SQL Console (Maintenance)"}
        </h1>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-900 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === "fr" ? "Requête SQL" : "SQL Query"}</span>
          <button 
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {language === "fr" ? "Exécution..." : "Running..."}</>
            ) : (
              <><Play className="w-4 h-4" /> {language === "fr" ? "Exécuter" : "Run"}</>
            )}
          </button>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SELECT * FROM users LIMIT 10;"
          className="w-full h-48 p-4 font-mono text-sm bg-slate-950 text-blue-400 focus:outline-none resize-none"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {results && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{language === "fr" ? "Résultats" : "Results"}</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
              {results.length} {language === "fr" ? "ligne(s)" : "row(s)"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  {results.length > 0 && typeof results[0] === 'object' && Object.keys(results[0]).map((key) => (
                    <th key={key} className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 border-b border-slate-50">
                    {typeof row === 'object' && row !== null ? (
                      Object.values(row).map((val: any, j) => (
                        <td key={j} className="p-3 text-sm text-slate-600 font-medium">
                          {val instanceof Date ? val.toLocaleString() : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </td>
                      ))
                    ) : (
                      <td className="p-3 text-sm text-slate-600 font-medium">{String(row)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm font-medium italic">
                {language === "fr" ? "Aucun résultat ou opération réussie (Insert/Update)" : "No results or operation succeeded (Insert/Update)"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
