import type { Kana } from "./kana";

export type DrillSettings = {
  version: 1;
  selectedKanaIds: string[];
};

export const SETTINGS_KEY = "kanaloop.settings.v1";

export function createSettings(kana: Kana[]): DrillSettings {
  return {
    version: 1,
    selectedKanaIds: kana.map((card) => card.id)
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
    selectedKanaIds: selectedKanaIds.filter((id): id is string => typeof id === "string" && allIds.has(id))
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
