import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Dict, Lang } from "@/lib/i18n";

interface ChartPoint {
  date: string;
  usage: number;
  perDay: number;
}

export function UsageTrendChart({ data, lang, t }: { data: ChartPoint[]; lang: Lang; t: Dict }) {
  const fmt = (n: number) => n.toLocaleString(lang === "pl" ? "pl-PL" : "en-US", { maximumFractionDigits: 1 });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
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
  );
}