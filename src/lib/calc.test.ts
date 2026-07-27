import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChartData,
  computeStats,
  findReadingBounds,
  toLocalDateInputValue,
  type Reading,
} from "./calc.ts";

const readings: Reading[] = [
  { id: "3", reading_date: "2026-07-20", value: 140, note: null },
  { id: "1", reading_date: "2026-07-01", value: 100, note: null },
  { id: "2", reading_date: "2026-07-10", value: 118, note: null },
];

test("findReadingBounds finds neighbours for a historical reading", () => {
  const bounds = findReadingBounds(readings, "2026-07-15");

  assert.equal(bounds.previous?.id, "2");
  assert.equal(bounds.next?.id, "3");
});

test("toLocalDateInputValue uses local calendar components", () => {
  assert.equal(toLocalDateInputValue(new Date(2026, 0, 2, 23, 30)), "2026-01-02");
});

test("computeStats uses the whole measured period", () => {
  const stats = computeStats(readings);

  assert.ok(stats);
  assert.equal(stats.totalConsumed, 40);
  assert.equal(stats.totalDays, 19);
  assert.equal(stats.weekly, (40 / 19) * 7);
});

test("buildChartData returns daily usage for each interval", () => {
  assert.deepEqual(buildChartData(readings), [
    { date: "2026-07-10", usage: 18, perDay: 2 },
    { date: "2026-07-20", usage: 22, perDay: 2.2 },
  ]);
});
