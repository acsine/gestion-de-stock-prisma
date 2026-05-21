"use client";

import { useState, useEffect } from "react";
import { X, Printer, Settings, Eye, LayoutGrid, Check, Plus, Minus, Trash2 } from "lucide-react";
import { Barcode } from "./Barcode";
import { useTranslation } from "@/locales/i18n";
import { formatCurrency } from "@/lib/utils";

export interface BarcodePrintItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  sellPrice?: number;
  quantity: number;
}

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems: BarcodePrintItem[];
}

export function BarcodePrintModal({ isOpen, onClose, initialItems }: BarcodePrintModalProps) {
  const { language } = useTranslation();
  const [items, setItems] = useState<BarcodePrintItem[]>([]);
  
  // Printing Configuration States
  const [columns, setColumns] = useState<number>(3);
  const [showName, setShowName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);
  const [showBorder, setShowBorder] = useState<boolean>(true);
  
  // Dimensions and styling states
  const [barHeight, setBarHeight] = useState<number>(45);
  const [barWidth, setBarWidth] = useState<number>(1.4);
  const [fontSize, setFontSize] = useState<number>(10);
  const [labelPadding, setLabelPadding] = useState<number>(8);
  const [paperMargin, setPaperMargin] = useState<number>(10); // mm

  useEffect(() => {
    if (isOpen) {
      // Deep copy to prevent mutating source data directly
      setItems(initialItems.map(item => ({ ...item, quantity: item.quantity || 1 })));
    }
  }, [isOpen, initialItems]);

  if (!isOpen) return null;

  // Sizing Presets
  const applyPreset = (preset: string) => {
    if (preset === "avery3x10") {
      setColumns(3);
      setBarHeight(42);
      setBarWidth(1.2);
      setFontSize(9);
      setLabelPadding(6);
      setPaperMargin(8);
    } else if (preset === "avery2x5") {
      setColumns(2);
      setBarHeight(65);
      setBarWidth(1.8);
      setFontSize(11);
      setLabelPadding(12);
      setPaperMargin(12);
    } else if (preset === "compact4") {
      setColumns(4);
      setBarHeight(35);
      setBarWidth(1.1);
      setFontSize(8);
      setLabelPadding(4);
      setPaperMargin(5);
    } else if (preset === "single") {
      setColumns(1);
      setBarHeight(70);
      setBarWidth(2.0);
      setFontSize(12);
      setLabelPadding(15);
      setPaperMargin(10);
    }
  };

  // Adjust Quantity
  const updateQty = (id: string, newQty: number) => {
    if (newQty < 0) return;
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item));
  };

  // Remove Item
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Total Labels Count
  const totalLabels = items.reduce((acc, curr) => acc + curr.quantity, 0);

  // Flat array of labels to render in the grid
  const flatLabels: BarcodePrintItem[] = [];
  items.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      flatLabels.push(item);
    }
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-fadeIn"
      style={{ position: "fixed", inset: 0 }}
    >
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-zoomIn print:hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {language === "fr" ? "Impression des codes-barres" : "Barcode Printer Setup"}
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                {totalLabels} {language === "fr" ? "étiquette(s) à imprimer" : "label(s) to print"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left panel: Control Settings */}
          <div className="w-full lg:w-96 border-r border-slate-100 flex flex-col overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            
            {/* Products List & Quantities */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5" />
                {language === "fr" ? "Articles sélectionnés" : "Selected Items"}
              </h3>
              {items.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-xs font-bold">
                  {language === "fr" ? "Aucun produit sélectionné" : "No products selected"}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-100 transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-slate-900 truncate leading-snug">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.sku}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Qty Adjustment */}
                        <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl p-0.5">
                          <button 
                            type="button"
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-white text-slate-500 rounded-lg hover:text-blue-600 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input 
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                            className="w-10 text-center bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button 
                            type="button"
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-white text-slate-500 rounded-lg hover:text-blue-600 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Presets */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" />
                {language === "fr" ? "Modèles prédéfinis" : "Sizing Presets"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => applyPreset("avery3x10")} 
                  className="p-2.5 text-left border border-slate-200 hover:border-blue-500 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-blue-50/20 transition-all active:scale-95"
                >
                  <p className="font-black text-blue-600">Avery 3x10</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">3 col, 30 par page</p>
                </button>
                <button 
                  onClick={() => applyPreset("avery2x5")} 
                  className="p-2.5 text-left border border-slate-200 hover:border-blue-500 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-blue-50/20 transition-all active:scale-95"
                >
                  <p className="font-black text-blue-600">Avery 2x5</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">2 col, 10 par page</p>
                </button>
                <button 
                  onClick={() => applyPreset("compact4")} 
                  className="p-2.5 text-left border border-slate-200 hover:border-blue-500 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-blue-50/20 transition-all active:scale-95"
                >
                  <p className="font-black text-blue-600">Compact x4</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">4 col, petit format</p>
                </button>
                <button 
                  onClick={() => applyPreset("single")} 
                  className="p-2.5 text-left border border-slate-200 hover:border-blue-500 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-blue-50/20 transition-all active:scale-95"
                >
                  <p className="font-black text-blue-600">Unitaire</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">1 col, grand format</p>
                </button>
              </div>
            </div>

            {/* Layout Options */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5" />
                {language === "fr" ? "Options de mise en page" : "Grid Configuration"}
              </h3>
              
              <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                  <span>{language === "fr" ? "Colonnes par ligne" : "Columns per Row"}</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black">{columns}</span>
                </label>
                <input 
                  type="range" min="1" max="8" value={columns} 
                  onChange={(e) => setColumns(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700">{language === "fr" ? "Nom du produit" : "Show Product Name"}</span>
                  <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700">{language === "fr" ? "Prix de vente" : "Show Price"}</span>
                  <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700">{language === "fr" ? "Afficher le SKU" : "Show SKU"}</span>
                  <input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700">{language === "fr" ? "Bordure de découpe" : "Cutline Borders"}</span>
                  <input type="checkbox" checked={showBorder} onChange={(e) => setShowBorder(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                </label>
              </div>
            </div>

            {/* Custom Sizing sliders */}
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {language === "fr" ? "Dimensions (Pixels & mm)" : "Finetuning Dimensions"}
              </h3>
              
              <div>
                <label className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>{language === "fr" ? "Hauteur code-barres" : "Barcode Height"}</span>
                  <span>{barHeight}px</span>
                </label>
                <input 
                  type="range" min="20" max="120" value={barHeight} 
                  onChange={(e) => setBarHeight(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded accent-blue-600"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>{language === "fr" ? "Épaisseur des barres" : "Bar Width Scale"}</span>
                  <span>{barWidth}</span>
                </label>
                <input 
                  type="range" min="0.8" max="3.0" step="0.1" value={barWidth} 
                  onChange={(e) => setBarWidth(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded accent-blue-600"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>{language === "fr" ? "Espacement étiquette" : "Label Inner Padding"}</span>
                  <span>{labelPadding}px</span>
                </label>
                <input 
                  type="range" min="2" max="24" value={labelPadding} 
                  onChange={(e) => setLabelPadding(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded accent-blue-600"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>{language === "fr" ? "Marge du papier" : "Page Margin"}</span>
                  <span>{paperMargin}mm</span>
                </label>
                <input 
                  type="range" min="0" max="30" value={paperMargin} 
                  onChange={(e) => setPaperMargin(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Right panel: Live Preview */}
          <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden relative">
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 z-10 shadow-lg">
              <Eye className="w-3.5 h-3.5" />
              <span>{language === "fr" ? "Aperçu avant impression (Virtuel)" : "Live Print Sheet Preview"}</span>
            </div>

            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-y-auto p-8 pt-14 flex justify-center items-start">
              {/* Mockup A4 Page Sheet */}
              <div 
                className="bg-white shadow-xl min-h-[1050px] w-[793px] origin-top scale-95 transition-transform overflow-hidden relative border border-slate-200"
                style={{
                  padding: `${paperMargin}mm`,
                  boxSizing: "border-box",
                }}
              >
                {flatLabels.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <LayoutGrid className="w-12 h-12 stroke-[1] mb-2 text-slate-300" />
                    <p className="text-sm font-bold">{language === "fr" ? "Rien à prévisualiser" : "Nothing to preview"}</p>
                    <p className="text-xs text-slate-400 mt-1">{language === "fr" ? "Augmentez les quantités des articles" : "Adjust product quantities to see sheets"}</p>
                  </div>
                ) : (
                  <div 
                    className="grid" 
                    style={{ 
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      gap: "2mm",
                    }}
                  >
                    {flatLabels.map((item, index) => (
                      <div 
                        key={`${item.id}-${index}`}
                        className="flex flex-col justify-between items-center text-center text-black"
                        style={{
                          padding: `${labelPadding}px`,
                          border: showBorder ? "1px dashed #d1d5db" : "1px solid transparent",
                          borderRadius: "4px",
                          boxSizing: "border-box",
                          backgroundColor: "#fff"
                        }}
                      >
                        {showName && (
                          <div className="text-[10px] font-black leading-tight text-slate-900 mb-1 max-w-full truncate px-1">
                            {item.name}
                          </div>
                        )}
                        
                        <div className="w-full flex items-center justify-center">
                          <Barcode 
                            value={item.barcode || item.sku} 
                            width={barWidth} 
                            height={barHeight} 
                            fontSize={fontSize}
                            displayValue={showSku}
                          />
                        </div>

                        {showPrice && item.sellPrice !== undefined && (
                          <div className="text-xs font-black text-blue-700 mt-1">
                            {formatCurrency(item.sellPrice)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-slate-500 font-bold">
            {language === "fr" 
              ? "* Le rendu réel dépend de votre imprimante. Ajustez les échelles et marges dans la boîte d'impression système."
              : "* Final scaling depends on system settings. Be sure to check 'Background graphics' and 'No margins' if needed."}
          </div>
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
            >
              {language === "fr" ? "Fermer" : "Close"}
            </button>
            <button 
              type="button"
              onClick={handlePrint}
              disabled={flatLabels.length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "fr" ? "Lancer l'impression" : "Print Labels"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDER SHEET SOLELY FOR PRINTER DIALOG (Invisible on Web UI, Visible on Print via @media print styles) */}
      <div 
        className="hidden print:block text-black bg-white print-barcodes-sheet"
        style={{
          padding: `${paperMargin}mm`,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div 
          className="grid" 
          style={{ 
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: "2mm",
          }}
        >
          {flatLabels.map((item, index) => (
            <div 
              key={`print-${item.id}-${index}`}
              className="flex flex-col justify-between items-center text-center"
              style={{
                padding: `${labelPadding}px`,
                border: showBorder ? "1px dashed #d1d5db" : "1px solid transparent",
                borderRadius: "4px",
                boxSizing: "border-box",
                pageBreakInside: "avoid",
                backgroundColor: "#fff"
              }}
            >
              {showName && (
                <div className="text-[10px] font-black leading-tight text-black mb-1 max-w-full truncate px-1">
                  {item.name}
                </div>
              )}
              
              <div className="w-full flex items-center justify-center">
                <Barcode 
                  value={item.barcode || item.sku} 
                  width={barWidth} 
                  height={barHeight} 
                  fontSize={fontSize}
                  displayValue={showSku}
                />
              </div>

              {showPrice && item.sellPrice !== undefined && (
                <div className="text-xs font-black text-black mt-1">
                  {formatCurrency(item.sellPrice)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
