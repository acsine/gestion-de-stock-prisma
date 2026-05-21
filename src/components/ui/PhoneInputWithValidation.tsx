"use client";

import React, { useState, useEffect, useRef } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Globe, ChevronDown, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const COUNTRY_CODES = [
  { code: "+237", flag: "🇨🇲", label: "Cameroun" },
  { code: "+225", flag: "🇨🇮", label: "Côte d'Ivoire" },
  { code: "+221", flag: "🇸🇳", label: "Sénégal" },
  { code: "+242", flag: "🇨🇬", label: "Congo" },
  { code: "+243", flag: "🇨🇩", label: "RD Congo" },
  { code: "+241", flag: "🇬🇦", label: "Gabon" },
  { code: "+229", flag: "🇧🇯", label: "Bénin" },
  { code: "+226", flag: "🇧🇫", label: "Burkina Faso" },
  { code: "+223", flag: "🇲🇱", label: "Mali" },
  { code: "+228", flag: "🇹🇬", label: "Togo" },
  { code: "+234", flag: "🇳🇬", label: "Nigeria" },
  { code: "+233", flag: "🇬🇭", label: "Ghana" },
  { code: "+212", flag: "🇲🇦", label: "Maroc" },
  { code: "+216", flag: "🇹🇳", label: "Tunisie" },
  { code: "+213", flag: "🇩🇿", label: "Algérie" },
  { code: "+20",  flag: "🇪🇬", label: "Égypte" },
  { code: "+33",  flag: "🇫🇷", label: "France" },
  { code: "+32",  flag: "🇧🇪", label: "Belgique" },
  { code: "+41",  flag: "🇨🇭", label: "Suisse" },
  { code: "+1",   flag: "🇺🇸", label: "USA/Canada" },
];

export function parsePhoneValue(value: string | undefined | null) {
  if (!value) return { dialCode: "+237", number: "" };
  
  const cleaned = value.trim();
  
  // Try parsing with libphonenumber-js
  const parsed = parsePhoneNumberFromString(cleaned);
  if (parsed) {
    const callingCode = `+${parsed.countryCallingCode}`;
    const countryMatch = COUNTRY_CODES.find(cc => cc.code === callingCode);
    if (countryMatch) {
      return {
        dialCode: countryMatch.code,
        number: parsed.nationalNumber as string
      };
    }
  }
  
  // Direct prefix matching fallback
  for (const cc of COUNTRY_CODES) {
    if (cleaned.startsWith(cc.code)) {
      return {
        dialCode: cc.code,
        number: cleaned.slice(cc.code.length).trim()
      };
    }
  }
  
  // Fallback to default
  return { dialCode: "+237", number: cleaned };
}

interface PhoneInputWithValidationProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export function PhoneInputWithValidation({
  value = "",
  onChange,
  error,
  placeholder = "6xx xxx xxx"
}: PhoneInputWithValidationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Parse incoming value
  const { dialCode: currentDial, number: currentNum } = parsePhoneValue(value);
  
  const [dialCode, setDialCode] = useState(currentDial);
  const [localNumber, setLocalNumber] = useState(currentNum);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Sync internal state with external value changes
  useEffect(() => {
    const { dialCode: d, number: n } = parsePhoneValue(value);
    setDialCode(d);
    setLocalNumber(n);
    
    if (!n.trim()) {
      setIsValid(null);
    } else {
      const full = `${d}${n.replace(/\s/g, "")}`;
      const parsed = parsePhoneNumberFromString(full);
      setIsValid(!!(parsed && parsed.isValid()));
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCountry = COUNTRY_CODES.find(c => c.code === dialCode) || COUNTRY_CODES[0];

  const handleNumberChange = (num: string) => {
    // Keep only numbers and spaces
    const cleanNum = num.replace(/[^\d\s]/g, "");
    setLocalNumber(cleanNum);
    
    if (!cleanNum.trim()) {
      setIsValid(null);
      onChange("");
    } else {
      const formattedFull = `${dialCode}${cleanNum.replace(/\s/g, "")}`;
      const parsed = parsePhoneNumberFromString(formattedFull);
      setIsValid(!!(parsed && parsed.isValid()));
      onChange(formattedFull);
    }
  };

  const handleCountrySelect = (code: string) => {
    setDialCode(code);
    setIsOpen(false);
    setSearch("");
    
    if (localNumber.trim()) {
      const formattedFull = `${code}${localNumber.replace(/\s/g, "")}`;
      const parsed = parsePhoneNumberFromString(formattedFull);
      setIsValid(!!(parsed && parsed.isValid()));
      onChange(formattedFull);
    }
  };

  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  return (
    <div className="relative w-full space-y-1">
      <div className="relative flex items-stretch w-full rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 focus-within:bg-white transition-all duration-300">
        
        {/* Country Selector Dropdown Trigger */}
        <div ref={dropdownRef} className="relative flex">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 sm:px-4 bg-slate-100 hover:bg-slate-200 border-r border-slate-200 text-sm font-bold text-slate-700 transition-all select-none focus:outline-none"
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="font-mono text-xs sm:text-sm">{selectedCountry.code}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Absolute Country Dropdown List */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-200">
              {/* Search Box */}
              <div className="p-2 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="Rechercher un pays..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto py-1">
                {filteredCountries.length === 0 ? (
                  <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center">
                    Aucun pays trouvé
                  </div>
                ) : (
                  filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountrySelect(c.code)}
                      className={cn(
                        "w-full px-4 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors hover:bg-slate-50",
                        c.code === dialCode ? "bg-blue-50/50 text-blue-600" : "text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{c.flag}</span>
                        <span>{c.label}</span>
                      </div>
                      <span className="font-mono text-slate-400">{c.code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Local Number Input field */}
        <input
          type="text"
          value={localNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 w-full px-4 py-3 bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 border-none outline-none focus:ring-0 focus:outline-none"
        />

        {/* Indicator Badges (Valid / Invalid) */}
        {isValid !== null && (
          <div className="flex items-center pr-3.5 pointer-events-none select-none">
            {isValid ? (
              <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
              </div>
            ) : (
              <div className="w-5 h-5 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.2)] animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 stroke-[3px]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warning/Error message */}
      {isValid === false && (
        <p className="text-[11px] font-black text-rose-500 flex items-center gap-1 pl-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>Numéro invalide pour le pays sélectionné</span>
        </p>
      )}
      
      {error && isValid !== false && (
        <p className="text-[11px] font-black text-rose-500 flex items-center gap-1 pl-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
