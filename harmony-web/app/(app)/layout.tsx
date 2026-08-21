import { RoleProvider } from "@/context/RoleContext";
import { ToastProvider } from "@/components/app/Toast";
import { Sidebar } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { Header } from "@/components/app/Header";

/**
 * Authenticated app shell — the dark product skin (#0a0d12 + Manrope/Inter).
 *
 * `RoleProvider` sits above everything so the header's role switcher re-gates
 * UI across Review, Team and every Settings tab from one place.
 *
 * The content track is `minmax(0, 1fr)`, not `1fr`: a bare `1fr` refuses to
 * shrink below its content, so one wide table would push the whole shell out
 * instead of scrolling inside its own card.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <ToastProvider>
        <div className="app-skin grid min-h-screen grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Sidebar />
          <div className="flex min-w-0 flex-col">
            <Header />
            <MobileNav />
            <main className="p-4 lg:p-[26px]">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </RoleProvider>
  );
}
