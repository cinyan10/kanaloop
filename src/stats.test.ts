import { describe, expect, it } from "vitest";
import {
  createDailyStats,
  loadDailyStats,
  markDailyGoalPrompted,
  recordFinishedKana,
  saveDailyStats,
  STATS_KEY,
  summarizeDailyStats
} from "./stats";

const NOW = new Date("2026-07-10T12:00:00.000Z").getTime();
const TOMORROW = new Date("2026-07-11T12:00:00.000Z").getTime();

describe("daily stats", () => {
  it("loads missing stats with defaults for today", () => {
    const storage = new StorageStub();

    expect(loadDailyStats(storage, NOW)).toEqual(createDailyStats(NOW));
  });

  it("loads corrupt stats with defaults for today", () => {
    const storage = new StorageStub();
    storage.setItem(STATS_KEY, "{bad json");

    expect(loadDailyStats(storage, NOW)).toEqual(createDailyStats(NOW));
  });

  it("resets stale stats to a blank today record", () => {
    const stats = recordFinishedKana(createDailyStats(NOW), "hiragana:a", 30_000, 1_000, NOW);

    expect(loadDailyStats(saved(stats), TOMORROW)).toEqual(createDailyStats(TOMORROW));
  });

  it("records unique remembered kana only once", () => {
    const once = recordFinishedKana(createDailyStats(NOW), "hiragana:a", 1_000, 500, NOW);
    const twice = recordFinishedKana(once, "hiragana:a", 1_000, 700, NOW);

    expect(summarizeDailyStats(twice).rememberedCount).toBe(1);
    expect(twice.recallCount).toBe(2);
  });

  it("averages only successful recalls", () => {
    const stats = recordFinishedKana(createDailyStats(NOW), "hiragana:a", 1_000, undefined, NOW);
    const next = recordFinishedKana(stats, "hiragana:i", 1_000, 2_000, NOW);

    expect(summarizeDailyStats(next).averageRecallMs).toBe(2_000);
  });

  it("keeps last 10 recall average separate from older successes", () => {
    let stats = createDailyStats(NOW);
    for (let index = 0; index < 12; index += 1) {
      stats = recordFinishedKana(stats, `kana:${index}`, 1_000, (index + 1) * 100, NOW);
    }

    expect(stats.recentRecallMs).toHaveLength(10);
    expect(summarizeDailyStats(stats).averageRecallMs).toBe(650);
    expect(summarizeDailyStats(stats).recentAverageRecallMs).toBe(750);
  });

  it("keeps daily goal prompt state only for today", () => {
    const prompted = markDailyGoalPrompted(createDailyStats(NOW), NOW);

    expect(loadDailyStats(saved(prompted), NOW).dailyGoalPromptedAt).toBe(NOW);
    expect(loadDailyStats(saved(prompted), TOMORROW).dailyGoalPromptedAt).toBeNull();
  });
});

function saved(stats: ReturnType<typeof createDailyStats>): StorageStub {
  const storage = new StorageStub();
  saveDailyStats(storage, stats);
  return storage;
}

class StorageStub implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
