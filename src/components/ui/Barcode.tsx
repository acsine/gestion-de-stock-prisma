"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

export function Barcode({ value, width = 1.6, height = 40, displayValue = true, fontSize = 11 }: BarcodeProps) {
  const elementRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (elementRef.current && value) {
      try {
        JsBarcode(elementRef.current, value, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: 4,
          background: "transparent",
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  if (!value) {
    return <span className="text-xs text-gray-400 italic">Sans code-barres</span>;
  }

  return <svg ref={elementRef} className="mx-auto max-w-full" />;
}
