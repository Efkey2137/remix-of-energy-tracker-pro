import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useT, type Lang } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

const SETTINGS_QUERY_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: PromiseLike<T>, ms = SETTINGS_QUERY_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Settings request timed out")), ms);
    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timer));
  });
}

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "EnergyTracker — Ustawienia" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useT();
  const [rate, setRate] = useState("0.85");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);
    setLoadError(false);

    withTimeout(supabase.from("profiles").select("kwh_rate").eq("id", user.id).maybeSingle())
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        if (data?.kwh_rate != null) setRate(String(data.kwh_rate));
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("settings load failed", err);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, reloadKey]);

  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const num = Number(rate);
    if (!Number.isFinite(num) || num < 0) {
      toast.error(t.errorInvalidRate);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ kwh_rate: num }).eq("id", user.id);
      if (error) toast.error(error.message);
      else toast.success(t.settingsSaved);
    } catch {
      toast.error(t.backendUnavailable);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell active="settings">
      <div className="space-y-6">
        {!loaded && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {loaded && loadError && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-center">
            <p className="text-sm text-destructive">{t.loadFailed}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-3 text-sm font-semibold text-primary"
            >
              {t.retry}
            </button>
          </div>
        )}

        <form
          onSubmit={saveRate}
          className="rounded-2xl p-5 border border-border space-y-3"
          style={{ background: "var(--gradient-card)" }}
        >
          <Label htmlFor="rate" className="text-base font-semibold">
            {t.kwhRate}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t.currency} / {t.kwh}
          </p>
          <div className="flex gap-2">
            <Input
              id="rate"
              type="number"
              step="0.01"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.save}
            </Button>
          </div>
        </form>

        <div
          className="rounded-2xl p-5 border border-border space-y-3"
          style={{ background: "var(--gradient-card)" }}
        >
          <div className="text-base font-semibold">{t.language}</div>
          <div className="grid grid-cols-2 gap-2">
            {(["pl", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  lang === l
                    ? "text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                style={lang === l ? { background: "var(--gradient-primary)" } : undefined}
              >
                {l === "pl" ? "Polski" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-5 border border-border"
          style={{ background: "var(--gradient-card)" }}
        >
          <div className="text-xs text-muted-foreground mb-2">{user?.email}</div>
          <Button variant="outline" onClick={logout} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            {t.logout}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
