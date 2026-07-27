import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";

const AUTH_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("BACKEND_TIMEOUT"));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function getFriendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message === "BACKEND_TIMEOUT" ||
    message === "Load failed" ||
    message === "Failed to fetch" ||
    message.includes("NetworkError")
  ) {
    return "Nie można połączyć się z bazą danych. Spróbuj ponownie za chwilę lub sprawdź konfigurację Supabase.";
  }

  if (message.includes("Invalid login credentials")) {
    return "Nieprawidłowy email lub hasło.";
  }

  if (message.includes("Email not confirmed")) {
    return "Potwierdź email przed logowaniem.";
  }

  return message || "Nie udało się zalogować. Spróbuj ponownie.";
}

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "EnergyTracker — Logowanie" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useT();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          AUTH_TIMEOUT_MS,
        );
        if (error) throw error;
      } else {
        const { error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          }),
          AUTH_TIMEOUT_MS,
        );
        if (error) throw error;
        toast.success("Konto zostało utworzone. Możesz się teraz zalogować.");
      }
    } catch (err) {
      toast.error(getFriendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4 flex gap-1 text-xs">
        <button
          onClick={() => setLang("pl")}
          className={`px-2 py-1 rounded ${lang === "pl" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          PL
        </button>
        <button
          onClick={() => setLang("en")}
          className={`px-2 py-1 rounded ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          EN
        </button>
      </div>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Zap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.appName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "in" ? t.welcome : t.welcomeNew}
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {mode === "in" ? t.authSubtitle : t.authSubtitleNew}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl p-6 border border-border"
          style={{ background: "var(--gradient-card)" }}
        >
          <div>
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">{t.password}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "in" ? t.signIn : t.signUp}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition"
          >
            {mode === "in" ? t.needAccount : t.haveAccount}
          </button>
        </form>
      </div>
    </div>
  );
}
