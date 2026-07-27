export interface Reading {
  id: string;
  reading_date: string;
  value: number;
  note: string | null;
}

export function toLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function findReadingBounds(readings: Reading[], date: string) {
  let previous: Reading | null = null;
  let next: Reading | null = null;

  for (const reading of readings) {
    if (
      reading.reading_date < date &&
      (!previous || reading.reading_date > previous.reading_date)
    ) {
      previous = reading;
    }

    if (reading.reading_date > date && (!next || reading.reading_date < next.reading_date)) {
      next = reading;
    }
  }

  return { previous, next };
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

export interface UsageStats {
  perDay: number;
  weekly: number;
  monthly: number;
  yearly: number;
  totalConsumed: number;
  totalDays: number;
}

export function computeStats(readings: Reading[]): UsageStats | null {
  if (readings.length < 2) return null;
  const sorted = [...readings].sort(
    (a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime(),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalConsumed = Number(last.value) - Number(first.value);
  const totalDays = daysBetween(first.reading_date, last.reading_date);
  const perDay = totalConsumed / totalDays;
  return {
    perDay,
    weekly: perDay * 7,
    monthly: perDay * 30,
    yearly: perDay * 365,
    totalConsumed,
    totalDays,
  };
}

export function buildChartData(readings: Reading[]) {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime(),
  );
  const out: { date: string; usage: number; perDay: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const usage = Number(cur.value) - Number(prev.value);
    const days = daysBetween(prev.reading_date, cur.reading_date);
    out.push({
      date: cur.reading_date,
      usage,
      perDay: usage / days,
    });
  }
  return out;
}
