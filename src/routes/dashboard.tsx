import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { computeStats, buildChartData, type Reading, daysBetween } from "@/lib/calc";
import { Plus, Zap, TrendingUp, Coins, CalendarDays, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const UsageTrendChart = lazy(() => import("@/components/UsageTrendChart").then((module) => ({ default: module.UsageTrendChart })));
const LazyAddReadingDialog = lazy(() => import("@/components/AddReadingDialog").then((module) => ({ default: module.AddReadingDialog })));

const DASHBOARD_QUERY_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: PromiseLike<T>, ms = DASHBOARD_QUERY_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Dashboard data request timed out")), ms);
    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timer));
  });
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "EnergyTracker — Pulpit" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useT();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [rate, setRate] = useState(0.85);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const [{ data: rs, error: readingsError }, { data: prof, error: profileError }] = await withTimeout(Promise.all([
          supabase.from("meter_readings").select("*").eq("user_id", user.id).order("reading_date", { ascending: false }).limit(250),
          supabase.from("profiles").select("kwh_rate").eq("id", user.id).maybeSingle(),
        ]));
        if (cancelled) return;
        if (readingsError) console.error("meter readings load failed", readingsError);
        if (profileError) console.error("profile load failed", profileError);
        setReadings((rs ?? []) as Reading[]);
        if (prof?.kwh_rate != null) setRate(Number(prof.kwh_rate));
      } catch (e) {
        console.error("dashboard load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load(readings.length === 0);
    const ch = supabase
      .channel("readings")
      .on("postgres_changes", { event: "*", schema: "public", table: "meter_readings" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user, authLoading]);

  const stats = useMemo(() => computeStats(readings), [readings]);
  const chartData = useMemo(() => buildChartData(readings), [readings]);
  const fmt = (n: number) => n.toLocaleString(lang === "pl" ? "pl-PL" : "en-US", { maximumFractionDigits: 1 });
  const cost = (kwh: number) => (kwh * rate).toLocaleString(lang === "pl" ? "pl-PL" : "en-US", { maximumFractionDigits: 2 }) + " " + t.currency;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell active="dashboard">
      <div className="space-y-6">
        <button
          onClick={() => setAddDialogOpen(true)}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Plus className="h-5 w-5" />
          {t.addReading}
        </button>
        {addDialogOpen && (
          <Suspense fallback={null}>
            <LazyAddReadingDialog readings={readings} open={addDialogOpen} onOpenChange={setAddDialogOpen} showTrigger={false} />
          </Suspense>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && !stats ? (
          <div className="rounded-2xl p-8 text-center border border-border" style={{ background: "var(--gradient-card)" }}>
            <Zap className="h-10 w-10 mx-auto text-primary mb-3 opacity-60" />
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatTile label={t.weekly} value={fmt(stats.weekly)} unit={t.kwh} />
              <StatTile label={t.monthly} value={fmt(stats.monthly)} unit={t.kwh} highlight />
              <StatTile label={t.yearly} value={fmt(stats.yearly)} unit={t.kwh} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CostTile icon={<Coins className="h-4 w-4" />} label={`${t.monthly.toUpperCase()}`} value={cost(stats.monthly)} />
              <CostTile icon={<TrendingUp className="h-4 w-4" />} label={`${t.yearly.toUpperCase()}`} value={cost(stats.yearly)} />
            </div>

            <div className="rounded-2xl p-4 border border-border" style={{ background: "var(--gradient-card)" }}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">{t.trend}</h2>
              </div>
              <div className="h-48">
                <Suspense fallback={<div className="h-full rounded-lg bg-muted/30" />}>
                  <UsageTrendChart data={chartData} lang={lang} t={t} />
                </Suspense>
              </div>
            </div>
          </>
        ) : null}

        <div>
          <h2 className="text-sm font-semibold mb-2 px-1 text-muted-foreground uppercase tracking-wider">{t.history}</h2>
          <ul className="space-y-2">
            {readings.map((r, i) => {
              const next = readings[i + 1];
              const diff = next ? Number(r.value) - Number(next.value) : null;
              const days = next ? daysBetween(next.reading_date, r.reading_date) : null;
              return (
                <li key={r.id} className="rounded-xl border border-border p-3 flex items-center justify-between" style={{ background: "var(--gradient-card)" }}>
                  <div>
                    <div className="text-sm font-semibold">{Number(r.value).toLocaleString(lang === "pl" ? "pl-PL" : "en-US")} {t.kwh}</div>
                    <div className="text-xs text-muted-foreground">{r.reading_date}</div>
                    {diff != null && days != null && (
                      <div className="text-xs text-primary mt-1">+{fmt(diff)} {t.kwh} · {days} {t.days}</div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(t.confirmDelete)) return;
                      const { error } = await supabase.from("meter_readings").delete().eq("id", r.id);
                      if (error) toast.error(error.message);
                    }}
                    className="p-2 text-muted-foreground hover:text-destructive transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function StatTile({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-2xl p-3 border border-border"
      style={{
        background: highlight ? "var(--gradient-primary)" : "var(--gradient-card)",
        boxShadow: highlight ? "var(--shadow-glow)" : undefined,
      }}
    >
      <div className={`text-[10px] uppercase tracking-wider mb-1 ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</div>
      <div className={`text-lg font-bold ${highlight ? "text-primary-foreground" : "text-foreground"}`}>{value}</div>
      <div className={`text-[10px] ${highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{unit}</div>
    </div>
  );
}

function CostTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 border border-border" style={{ background: "var(--gradient-card)" }}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}
