import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          500: "#4F46E5", // Luxury Indigo
          600: "#4338CA",
          700: "#3730A3",
          900: "#1E1B4B",
        },
        blue: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#4F46E5", // Upgraded Royal Indigo
          600: "#4338CA",
          700: "#3730A3",
          800: "#1E1B4B",
          900: "#090D1A",
        },
        emerald: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981", // High-vibrancy Emerald
          600: "#059669",
          700: "#047857",
        },
        rose: {
          50: "#FFF1F2",
          100: "#FFE4E6",
          500: "#F43F5E", // Rich Coral-Rose
          600: "#E11D48",
          700: "#BE123C",
        },
        sidebar: "#090D1A", // Sleek dark slate-navy sidebar
      },
      boxShadow: {
        glow: "0 0 25px rgba(79, 70, 229, 0.2)",
        "glow-accent": "0 0 25px rgba(6, 182, 212, 0.2)",
        "glow-success": "0 0 25px rgba(16, 185, 129, 0.2)",
        "glow-error": "0 0 25px rgba(244, 63, 94, 0.2)",
      }
    },
  },
  plugins: [],
};
export default config;
