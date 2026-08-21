import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

/* Marketing display type */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

/* Body/UI across both skins */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

/* Marketing mono (code card, kickers, chart labels) */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/* App-skin headings, labels and buttons */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Harmony — Disclosure consistency, solved.",
  description:
    "Harmony reads every draft against your entire disclosure history, flags what's off with cited evidence, and routes each document through mandatory human approval.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable} ${manrope.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
