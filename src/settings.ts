import type { Kana } from "./kana";

export type DrillSettings = {
  version: 1;
  selectedKanaIds: string[];
  inputModeEnabled: boolean;
  showStatsOnMainPage: boolean;
  learningGoalMinutes: number;
  learningGoalScope: LearningGoalScope;
};

export type LearningGoalScope = "daily" | "session";

export const SETTINGS_KEY = "kanaloop.settings.v1";

export function createSettings(kana: Kana[]): DrillSettings {
  return {
    version: 1,
    selectedKanaIds: kana.map((card) => card.id),
    inputModeEnabled: false,
    showStatsOnMainPage: true,
    learningGoalMinutes: 0,
    learningGoalScope: "daily"
  };
}

export function normalizeSettings(value: unknown, kana: Kana[]): DrillSettings {
  const allIds = new Set(kana.map((card) => card.id));
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) {
    return createSettings(kana);
  }

  const selectedKanaIds = (value as { selectedKanaIds?: unknown }).selectedKanaIds;
  if (!Array.isArray(selectedKanaIds)) {
    return createSettings(kana);
  }

  return {
    version: 1,
    selectedKanaIds: selectedKanaIds.filter((id): id is string => typeof id === "string" && allIds.has(id)),
    inputModeEnabled: (value as { inputModeEnabled?: unknown }).inputModeEnabled === true,
    showStatsOnMainPage: (value as { showStatsOnMainPage?: unknown }).showStatsOnMainPage !== false,
    learningGoalMinutes: normalizeGoalMinutes((value as { learningGoalMinutes?: unknown }).learningGoalMinutes),
    learningGoalScope:
      (value as { learningGoalScope?: unknown }).learningGoalScope === "session" ? "session" : "daily"
  };
}

export function loadSettings(storage: Storage, kana: Kana[]): DrillSettings {
  try {
    return normalizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY) ?? "null"), kana);
  } catch {
    return createSettings(kana);
  }
}

export function saveSettings(storage: Storage, settings: DrillSettings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function normalizeGoalMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}
