"use client";
// src/components/ui/SearchableSelect.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  sub?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  name?: string;
  disabled?: boolean;
  /** If true, adds an "all" option at the top (for filters) */
  allowAll?: boolean;
  allLabel?: string;
}

export function SearchableSelect({
  options,
  value = "",
  onChange,
  placeholder = "Sélectionner…",
  searchPlaceholder = "Rechercher…",
  className = "",
  name,
  disabled = false,
  allowAll = false,
  allLabel = "Tous",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.sub && opt.sub.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption
    ? selectedOption.label
    : allowAll && value === ""
    ? allLabel
    : placeholder;

  const handleSelect = useCallback(
    (val: string) => {
      onChange?.(val);
      setIsOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.("");
      setSearch("");
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`input min-h-[44px] w-full flex items-center justify-between gap-3 text-left cursor-pointer transition-all
          ${isOpen ? "ring-2 ring-blue-500 border-blue-500 shadow-sm" : "hover:shadow-sm"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:border-gray-400"}
          ${!selectedOption && !(allowAll && value === "") ? "text-gray-400" : "text-gray-900"}`}
      >
        <span className="truncate text-sm font-medium">{displayLabel}</span>
        <div className="flex items-center gap-2 flex-shrink-0 border-l pl-2 border-gray-100">
          {value && !allowAll && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
              isOpen ? "rotate-180 text-blue-500" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden">
          {/* Search bar */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {allowAll && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-blue-50 transition-colors
                  ${value === "" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
              >
                <span>{allLabel}</span>
                {value === "" && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                Aucun résultat pour « {search} »
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-blue-50 transition-colors
                    ${value === opt.value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
                >
                  <div className="min-w-0">
                    <div className="truncate">{opt.label}</div>
                    {opt.sub && (
                      <div className="text-xs text-gray-400 truncate">{opt.sub}</div>
                    )}
                  </div>
                  {value === opt.value && <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
