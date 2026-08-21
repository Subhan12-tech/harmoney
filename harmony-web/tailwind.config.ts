import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./context/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ---- Marketing skin (dark cinematic, #000 based) ---- */
        ink: "#000000",
        fg: "#e5e5e5",
        muted: "#8a8a8a",
        muted2: "#a3a3a3",
        card: "#050505",
        surface: "#0a0a0a",
        hairline: "#0f0f0f",
        edge: "#141414",
        edge2: "#1a1a1a",

        /* ---- App skin (dark product UI, #0a0d12 based) ---- */
        app: {
          bg: "var(--bg)",
          elev: "var(--bg-elev)",
          surface: "var(--surface)",
          surface2: "var(--surface-2)",
          border: "var(--border)",
          text: "var(--text)",
          muted: "var(--muted)",
          accent: "var(--accent)",
          accent2: "var(--accent-2)",
          warn: "var(--warn)",
          danger: "var(--danger)",
        },
      },
      fontFamily: {
        /* marketing */
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
        /* app skin headings */
        heading: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
