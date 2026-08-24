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
      data-theme="dark"
      className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Applies the stored theme BEFORE first paint. Without this the page
          renders dark, React hydrates, and only then switches - a white flash
          on every navigation for anyone using light mode.

          It has to be inline and synchronous in <head>; a component cannot run
          early enough. suppressHydrationWarning above is because this
          deliberately changes an attribute the server rendered.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('harmony.theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
