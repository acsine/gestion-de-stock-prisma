"use client";
import { Loader2 } from "lucide-react";

interface TableLoadingProps {
  colSpan: number;
  message?: string;
}

export function TableLoading({ colSpan, message = "Chargement des données..." }: TableLoadingProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-20 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <div className="absolute inset-0 w-10 h-10 border-4 border-blue-100 rounded-full"></div>
          </div>
          <p className="text-sm font-medium text-gray-500 animate-pulse">{message}</p>
        </div>
      </td>
    </tr>
  );
}

export function TableEmpty({ colSpan, message, icon: Icon }: { colSpan: number; message: string; icon: any }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-20 text-center">
        <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
          <Icon className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      </td>
    </tr>
  );
}
