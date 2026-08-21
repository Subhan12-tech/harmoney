import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        fg: "#e5e5e5",
        muted: "#8a8a8a",
        muted2: "#a3a3a3",
        card: "#050505",
        surface: "#0a0a0a",
        hairline: "#0f0f0f",
        edge: "#141414",
        edge2: "#1a1a1a",
      },
      fontFamily: {
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
