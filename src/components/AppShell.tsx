import { Link, useNavigate } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Settings as SettingsIcon, LogOut, LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children, active }: { children: ReactNode; active: "dashboard" | "settings" }) {
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">{t.appName}</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLang(lang === "pl" ? "en" : "pl")}
              className="text-xs font-semibold px-2 py-1 rounded bg-muted text-muted-foreground hover:text-foreground transition"
            >
              {lang.toUpperCase()}
            </button>
            <button onClick={logout} className="p-2 rounded text-muted-foreground hover:text-foreground transition" aria-label={t.logout}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto grid grid-cols-2">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center gap-1 py-3 text-xs ${active === "dashboard" ? "text-primary" : "text-muted-foreground"}`}
          >
            <LayoutDashboard className="h-5 w-5" />
            {t.dashboard}
          </Link>
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-1 py-3 text-xs ${active === "settings" ? "text-primary" : "text-muted-foreground"}`}
          >
            <SettingsIcon className="h-5 w-5" />
            {t.settings}
          </Link>
        </div>
      </nav>
    </div>
  );
}