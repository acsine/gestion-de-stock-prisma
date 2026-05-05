"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Info } from "lucide-react";
import Link from "next/link";

export default function NewInvoicePage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle Facture</h1>
      </div>

      <div className="card p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Utilisez la Caisse (POS)</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Pour créer une nouvelle facture, veuillez utiliser le module de Caisse. 
            Il permet de scanner les produits, de gérer les remises et d'imprimer les tickets ou factures A4.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href="/caisse" className="btn-primary w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Aller à la Caisse
          </Link>
          <button onClick={() => router.back()} className="btn-secondary w-full sm:w-auto px-8 py-3">
            Retour
          </button>
        </div>

        <div className="mt-8 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-sm flex gap-3 text-left">
          <Info className="w-5 h-5 flex-shrink-0" />
          <p>
            L'éditeur de facture B2B détaillé (avec saisie libre) est actuellement en cours de développement. 
            Veuillez utiliser la caisse pour vos opérations courantes.
          </p>
        </div>
      </div>
    </div>
  );
}
