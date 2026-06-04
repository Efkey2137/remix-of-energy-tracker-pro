import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let resolvedInitialSession = false;

    const finishAuthCheck = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      resolvedInitialSession = true;
      setLoading(false);
    };

    const fallbackTimer = window.setTimeout(() => {
      if (!mounted || resolvedInitialSession) return;
      console.warn("Auth session restore timed out");
      finishAuthCheck(null);
    }, 10000);

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("Błąd pobierania sesji:", error);
        }
        finishAuthCheck(data?.session ?? null);
      })
      .catch((err) => {
        console.error("Nieoczekiwany błąd sesji:", err);
        finishAuthCheck(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      finishAuthCheck(s);
    });

    return () => {
      mounted = false;
      window.clearTimeout(fallbackTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);