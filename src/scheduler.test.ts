import { describe, expect, it } from "vitest";
import { KANA } from "./kana";
import { createSettings, loadSettings, saveSettings, SETTINGS_KEY } from "./settings";
import {
  createProgress,
  gradeCard,
  loadProgress,
  saveProgress,
  selectCards,
  selectNextCard,
  STORAGE_KEY
} from "./scheduler";

const NOW = new Date("2026-07-10T12:00:00.000Z").getTime();

describe("scheduler", () => {
  it("shows new cards before recognized cards that are not due", () => {
    const progress = createProgress(KANA, NOW);
    const first = KANA[0];
    const second = KANA[1];
    progress.cards[first.id] = {
      status: "recognized",
      streak: 6,
      lapses: 0,
      intervalDays: 12,
      ease: 2.6,
      dueAt: NOW + 12 * 24 * 60 * 60 * 1000,
      lastReviewedAt: NOW
    };

    expect(selectNextCard([first, second], progress, "both", NOW)).toEqual(second);
  });

  it("gives remembered cards longer intervals", () => {
    const progress = createProgress(KANA, NOW);
    const card = KANA[0];
    const once = gradeCard(progress, card.id, "remembered", NOW);
    const twice = gradeCard(once, card.id, "remembered", NOW + 1);

    expect(twice.cards[card.id].intervalDays).toBeGreaterThan(once.cards[card.id].intervalDays);
  });

  it("returns forgotten cards soon", () => {
    const progress = createProgress(KANA, NOW);
    const card = KANA[0];
    const next = gradeCard(progress, card.id, "forgot", NOW);

    expect(next.cards[card.id].status).toBe("learning");
    expect(next.cards[card.id].dueAt - NOW).toBe(30 * 60 * 1000);
    expect(next.cards[card.id].lapses).toBe(1);
  });

  it("filters by kana script", () => {
    expect(selectCards(KANA, "hiragana").every((card) => card.script === "hiragana")).toBe(true);
    expect(selectCards(KANA, "katakana").every((card) => card.script === "katakana")).toBe(true);
  });

  it("filters by selected kana", () => {
    const selectedIds = new Set([KANA[0].id]);

    expect(selectCards(KANA, "both", selectedIds)).toEqual([KANA[0]]);
  });

  it("randomizes equal-priority new cards", () => {
    const progress = createProgress(KANA, NOW);

    expect(selectNextCard([KANA[0], KANA[1]], progress, "both", NOW, undefined, () => 0.9)).toEqual(KANA[1]);
  });
});

describe("progress persistence", () => {
  it("loads missing progress with defaults", () => {
    const storage = new StorageStub();

    expect(loadProgress(storage, KANA, NOW).cards[KANA[0].id].status).toBe("new");
  });

  it("round-trips progress through local storage", () => {
    const storage = new StorageStub();
    const progress = gradeCard(createProgress(KANA, NOW), KANA[0].id, "remembered", NOW);

    saveProgress(storage, progress);

    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}").cards[KANA[0].id].streak).toBe(1);
    expect(loadProgress(storage, KANA, NOW).cards[KANA[0].id].streak).toBe(1);
  });

  it("loads settings defaults with every kana selected", () => {
    const storage = new StorageStub();

    expect(loadSettings(storage, KANA).selectedKanaIds).toHaveLength(KANA.length);
  });

  it("round-trips selected kana settings", () => {
    const storage = new StorageStub();
    const settings = { ...createSettings(KANA), selectedKanaIds: [KANA[0].id] };

    saveSettings(storage, settings);

    expect(JSON.parse(storage.getItem(SETTINGS_KEY) ?? "{}").selectedKanaIds).toEqual([KANA[0].id]);
    expect(loadSettings(storage, KANA).selectedKanaIds).toEqual([KANA[0].id]);
  });
});

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
