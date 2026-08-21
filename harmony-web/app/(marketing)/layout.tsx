import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

/**
 * Marketing shell — the dark cinematic skin (#000 + Instrument Serif).
 *
 * The nav is layered over the page rather than stacked above it, so the
 * landing hero's radial glow can originate at y=0 and read behind the nav.
 * Marketing pages therefore reserve 78px of top padding for it.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-skin relative min-h-screen bg-black font-sans text-[#e5e5e5]">
      <header className="absolute inset-x-0 top-0 z-30">
        <Nav />
      </header>
      <main>{children}</main>
      <Footer />
    </div>
  );
}
