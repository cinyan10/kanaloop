export type DailyStats = {
  version: 1;
  dateKey: string;
  learningMs: number;
  rememberedKanaIds: string[];
  recallCount: number;
  recallTotalMs: number;
  recentRecallMs: number[];
  dailyGoalPromptedAt: number | null;
};

export const STATS_KEY = "kanaloop.stats.v1";
export const RECENT_RECALL_LIMIT = 10;

export function dateKey(now = Date.now()): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDailyStats(now = Date.now()): DailyStats {
  return {
    version: 1,
    dateKey: dateKey(now),
    learningMs: 0,
    rememberedKanaIds: [],
    recallCount: 0,
    recallTotalMs: 0,
    recentRecallMs: [],
    dailyGoalPromptedAt: null
  };
}

export function normalizeDailyStats(value: unknown, now = Date.now()): DailyStats {
  const today = dateKey(now);
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) {
    return createDailyStats(now);
  }

  const stats = value as Partial<DailyStats>;
  if (stats.dateKey !== today) {
    return createDailyStats(now);
  }

  const rememberedKanaIds = Array.isArray(stats.rememberedKanaIds)
    ? Array.from(new Set(stats.rememberedKanaIds.filter((id): id is string => typeof id === "string")))
    : [];
  const recentRecallMs = Array.isArray(stats.recentRecallMs)
    ? stats.recentRecallMs.filter(isNonNegativeNumber).slice(0, RECENT_RECALL_LIMIT)
    : [];

  return {
    version: 1,
    dateKey: today,
    learningMs: isNonNegativeNumber(stats.learningMs) ? stats.learningMs : 0,
    rememberedKanaIds,
    recallCount: isNonNegativeNumber(stats.recallCount) ? Math.floor(stats.recallCount) : 0,
    recallTotalMs: isNonNegativeNumber(stats.recallTotalMs) ? stats.recallTotalMs : 0,
    recentRecallMs,
    dailyGoalPromptedAt:
      stats.dailyGoalPromptedAt === null || isNonNegativeNumber(stats.dailyGoalPromptedAt)
        ? stats.dailyGoalPromptedAt
        : null
  };
}

export function loadDailyStats(storage: Storage, now = Date.now()): DailyStats {
  try {
    return normalizeDailyStats(JSON.parse(storage.getItem(STATS_KEY) ?? "null"), now);
  } catch {
    return createDailyStats(now);
  }
}

export function saveDailyStats(storage: Storage, stats: DailyStats): void {
  storage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordFinishedKana(
  stats: DailyStats,
  cardId: string,
  learningMs: number,
  recallMs?: number,
  now = Date.now()
): DailyStats {
  const todayStats = normalizeDailyStats(stats, now);
  const nextLearningMs = todayStats.learningMs + Math.max(0, learningMs);

  if (!isNonNegativeNumber(recallMs)) {
    return {
      ...todayStats,
      learningMs: nextLearningMs
    };
  }

  return {
    ...todayStats,
    learningMs: nextLearningMs,
    rememberedKanaIds: Array.from(new Set([...todayStats.rememberedKanaIds, cardId])),
    recallCount: todayStats.recallCount + 1,
    recallTotalMs: todayStats.recallTotalMs + recallMs,
    recentRecallMs: [recallMs, ...todayStats.recentRecallMs].slice(0, RECENT_RECALL_LIMIT)
  };
}

export function markDailyGoalPrompted(stats: DailyStats, now = Date.now()): DailyStats {
  return {
    ...normalizeDailyStats(stats, now),
    dailyGoalPromptedAt: now
  };
}

export function summarizeDailyStats(stats: DailyStats) {
  const recentTotalMs = stats.recentRecallMs.reduce((sum, value) => sum + value, 0);
  return {
    rememberedCount: stats.rememberedKanaIds.length,
    averageRecallMs: stats.recallCount > 0 ? stats.recallTotalMs / stats.recallCount : null,
    recentAverageRecallMs: stats.recentRecallMs.length > 0 ? recentTotalMs / stats.recentRecallMs.length : null
  };
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
