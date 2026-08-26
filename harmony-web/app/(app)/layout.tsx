import { RoleProvider } from "@/context/RoleContext";
import { MeProvider } from "@/context/MeContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ToastProvider } from "@/components/app/Toast";
import { Sidebar } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { Header } from "@/components/app/Header";

/**
 * Authenticated app shell. Theme comes from the tokens in globals.css, which
 * `data-theme` on <html> switches between dark and light.
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
    <AuthGuard>
      <RoleProvider>
      <MeProvider>
      <ToastProvider>
        <div className="app-skin grid min-h-screen grid-cols-1 lg:grid-cols-[228px_minmax(0,1fr)]">
          <Sidebar />
          <div className="flex min-w-0 flex-col">
            <Header />
            <MobileNav />
            <main className="p-4 lg:px-9 lg:py-8">
              <div style={{ maxWidth: 1180, margin: "0 auto" }}>{children}</div>
            </main>
          </div>
        </div>
      </ToastProvider>
      </MeProvider>
      </RoleProvider>
    </AuthGuard>
  );
}
