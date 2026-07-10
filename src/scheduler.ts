import type { Kana, KanaScript } from "./kana";

export type DrillMode = KanaScript | "both";
export type CardStatus = "new" | "learning" | "recognized";
export type Grade = "remembered" | "forgot";

export type ProgressRecord = {
  status: CardStatus;
  streak: number;
  lapses: number;
  intervalDays: number;
  ease: number;
  dueAt: number;
  lastReviewedAt: number | null;
};

export type ProgressState = {
  version: 1;
  cards: Record<string, ProgressRecord>;
};

export const STORAGE_KEY = "kanaloop.progress.v1";

export function createRecord(now = Date.now()): ProgressRecord {
  return {
    status: "new",
    streak: 0,
    lapses: 0,
    intervalDays: 0,
    ease: 2.3,
    dueAt: now,
    lastReviewedAt: null
  };
}

export function createProgress(kana: Kana[], now = Date.now()): ProgressState {
  return {
    version: 1,
    cards: Object.fromEntries(kana.map((card) => [card.id, createRecord(now)]))
  };
}

export function normalizeProgress(
  value: unknown,
  kana: Kana[],
  now = Date.now()
): ProgressState {
  const blank = createProgress(kana, now);
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) {
    return blank;
  }

  const cards = (value as { cards?: unknown }).cards;
  if (!cards || typeof cards !== "object") {
    return blank;
  }

  for (const card of kana) {
    const record = (cards as Record<string, unknown>)[card.id];
    blank.cards[card.id] = isRecord(record) ? record : createRecord(now);
  }

  return blank;
}

export function loadProgress(storage: Storage, kana: Kana[], now = Date.now()): ProgressState {
  try {
    return normalizeProgress(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null"), kana, now);
  } catch {
    return createProgress(kana, now);
  }
}

export function saveProgress(storage: Storage, progress: ProgressState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function clearProgress(storage: Storage): void {
  storage.removeItem(STORAGE_KEY);
}

export function selectCards(kana: Kana[], mode: DrillMode): Kana[] {
  return mode === "both" ? kana : kana.filter((card) => card.script === mode);
}

export function selectNextCard(
  kana: Kana[],
  progress: ProgressState,
  mode: DrillMode,
  now = Date.now()
): Kana | null {
  const candidates = selectCards(kana, mode);
  if (candidates.length === 0) {
    return null;
  }

  return candidates
    .map((card) => ({ card, score: scoreCard(progress.cards[card.id] ?? createRecord(now), now) }))
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))[0].card;
}

export function gradeCard(
  progress: ProgressState,
  cardId: string,
  grade: Grade,
  now = Date.now()
): ProgressState {
  const current = progress.cards[cardId] ?? createRecord(now);
  const next =
    grade === "forgot"
      ? {
          ...current,
          status: "learning" as const,
          streak: 0,
          lapses: current.lapses + 1,
          intervalDays: 0.02,
          ease: Math.max(1.3, current.ease - 0.25),
          dueAt: now + 30 * 60 * 1000,
          lastReviewedAt: now
        }
      : rememberCard(current, now);

  return {
    ...progress,
    cards: {
      ...progress.cards,
      [cardId]: next
    }
  };
}

export function summarize(kana: Kana[], progress: ProgressState, mode: DrillMode, now = Date.now()) {
  const cards = selectCards(kana, mode);
  let due = 0;
  let recognized = 0;
  let learning = 0;
  let bestStreak = 0;

  for (const card of cards) {
    const record = progress.cards[card.id] ?? createRecord(now);
    if (record.dueAt <= now || record.status === "new") {
      due += 1;
    }
    if (record.status === "recognized") {
      recognized += 1;
    }
    if (record.status === "learning") {
      learning += 1;
    }
    bestStreak = Math.max(bestStreak, record.streak);
  }

  return { total: cards.length, due, recognized, learning, bestStreak };
}

function rememberCard(record: ProgressRecord, now: number): ProgressRecord {
  const streak = record.streak + 1;
  const intervalDays =
    streak === 1 ? 0.25 : streak === 2 ? 1 : Math.max(2, record.intervalDays * record.ease);
  const status: CardStatus = streak >= 5 ? "recognized" : "learning";
  return {
    ...record,
    status,
    streak,
    intervalDays,
    ease: Math.min(3, record.ease + 0.08),
    dueAt: now + intervalDays * 24 * 60 * 60 * 1000,
    lastReviewedAt: now
  };
}

function scoreCard(record: ProgressRecord, now: number): number {
  if (record.status === "new") {
    return 1000 - record.streak;
  }

  const overdueHours = (now - record.dueAt) / (60 * 60 * 1000);
  if (overdueHours >= 0) {
    const lapseBoost = record.lapses * 30;
    const streakPenalty = record.streak * 8;
    const statusPenalty = record.status === "recognized" ? 80 : 0;
    return 800 + overdueHours + lapseBoost - streakPenalty - statusPenalty;
  }

  return record.status === "recognized" ? -200 + overdueHours : overdueHours;
}

function isRecord(value: unknown): value is ProgressRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as ProgressRecord;
  return (
    (record.status === "new" || record.status === "learning" || record.status === "recognized") &&
    Number.isFinite(record.streak) &&
    Number.isFinite(record.lapses) &&
    Number.isFinite(record.intervalDays) &&
    Number.isFinite(record.ease) &&
    Number.isFinite(record.dueAt) &&
    (record.lastReviewedAt === null || Number.isFinite(record.lastReviewedAt))
  );
}
