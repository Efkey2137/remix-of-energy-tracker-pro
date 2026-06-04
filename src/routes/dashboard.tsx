import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { computeStats, buildChartData, type Reading, daysBetween } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Zap, TrendingUp, Coins, CalendarDays, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

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
          supabase.from("meter_readings").select("*").order("reading_date", { ascending: false }),
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
        <AddReadingDialog readings={readings} />

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
        ) : (
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
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="usage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.78 0.18 75)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="oklch(0.78 0.18 75)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                    <XAxis dataKey="date" tick={{ fill: "oklch(0.7 0.02 255)", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fill: "oklch(0.7 0.02 255)", fontSize: 10 }} width={30} />
                    <Tooltip
                      contentStyle={{ background: "oklch(0.21 0.025 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "oklch(0.97 0.01 250)" }}
                      formatter={(v: number, name) => [`${fmt(v)} ${t.kwh}`, name === "perDay" ? t.perDay : t.consumed]}
                    />
                    <Area type="monotone" dataKey="perDay" stroke="oklch(0.78 0.18 75)" strokeWidth={2} fill="url(#usage)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

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

function AddReadingDialog({ readings }: { readings: Reading[] }) {
  const { t } = useT();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const lastValue = readings.length ? Number(readings[0].value) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Invalid value");
      return;
    }
    if (lastValue != null && num < lastValue) {
      toast.error(t.errorLowerReading);
      return;
    }
    if (readings.some((r) => r.reading_date === date)) {
      toast.error(t.errorSameDate);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("meter_readings").insert({
      user_id: user.id,
      reading_date: date,
      value: num,
      note: note || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.readingSaved);
    setOpen(false);
    setValue("");
    setNote("");
    setDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Plus className="h-5 w-5" />
          {t.addReading}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t.addReading}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="date">{t.date}</Label>
            <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="value">{t.meterValue}</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min={lastValue ?? 0}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1"
              placeholder={lastValue != null ? `> ${lastValue}` : ""}
            />
            {lastValue == null && (
              <p className="text-xs text-muted-foreground mt-1">{t.firstReadingInfo}</p>
            )}
          </div>
          <div>
            <Label htmlFor="note">{t.note}</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" maxLength={200} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}