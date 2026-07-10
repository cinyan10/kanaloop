import { useCallback, useEffect, useMemo, useState } from "react";
import { canSpeak, playJapanese, preloadJapanese } from "./audio";
import { KANA, KANA_GROUPS } from "./kana";
import type { Kana } from "./kana";
import { createSettings, loadSettings, saveSettings } from "./settings";
import type { DrillMode, Grade, ProgressState } from "./scheduler";
import {
  createProgress,
  gradeCard,
  loadProgress,
  saveProgress,
  selectNextCard,
  summarize
} from "./scheduler";

const MODES: { label: string; value: DrillMode }[] = [
  { label: "Both", value: "both" },
  { label: "Hiragana", value: "hiragana" },
  { label: "Katakana", value: "katakana" }
];

type HistoryEntry = {
  cardId: string;
  progressBefore: ProgressState;
};

export default function App() {
  const [mode, setMode] = useState<DrillMode>("both");
  const [view, setView] = useState<"drill" | "settings">("drill");
  const [progress, setProgress] = useState(() => loadProgress(window.localStorage, KANA));
  const [settings, setSettings] = useState(() => loadSettings(window.localStorage, KANA));
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [spoken, setSpoken] = useState<"idle" | "recording" | "tts" | "unavailable">("idle");
  const speechReady = canSpeak();
  const selectedIds = useMemo(() => new Set(settings.selectedKanaIds), [settings.selectedKanaIds]);

  const activeCard = useMemo(() => KANA.find((card) => card.id === activeCardId) ?? null, [activeCardId]);
  const stats = useMemo(() => summarize(KANA, progress, mode, Date.now(), selectedIds), [progress, mode, selectedIds]);

  const persist = useCallback((nextProgress: typeof progress) => {
    setProgress(nextProgress);
    saveProgress(window.localStorage, nextProgress);
  }, []);

  const chooseNextCard = useCallback(
    (nextProgress: ProgressState, excludeId?: string | null): Kana | null => {
      const pool = excludeId && stats.total > 1 ? KANA.filter((card) => card.id !== excludeId) : KANA;
      return selectNextCard(pool, nextProgress, mode, Date.now(), selectedIds);
    },
    [mode, selectedIds, stats.total]
  );

  const leaveAnswerMode = useCallback(() => {
    setRevealed(false);
    setSpoken("idle");
  }, []);

  const persistSettings = useCallback((selectedKanaIds: string[]) => {
    const nextSettings = { version: 1 as const, selectedKanaIds };
    setSettings(nextSettings);
    saveSettings(window.localStorage, nextSettings);
    setActiveCardId(null);
    setHistory([]);
    leaveAnswerMode();
  }, [leaveAnswerMode]);

  useEffect(() => {
    if (view !== "drill") {
      return;
    }
    const activeIsAllowed =
      activeCard && (mode === "both" || activeCard.script === mode) && selectedIds.has(activeCard.id);
    if (!activeIsAllowed) {
      setActiveCardId(chooseNextCard(progress)?.id ?? null);
      leaveAnswerMode();
    }
  }, [activeCard, chooseNextCard, leaveAnswerMode, mode, progress, selectedIds, view]);

  useEffect(() => {
    if (activeCard) {
      preloadJapanese(activeCard);
    }
  }, [activeCard]);

  const reveal = useCallback(async () => {
    if (!activeCard) {
      return;
    }
    setRevealed(true);
    setSpoken(await playJapanese(activeCard));
  }, [activeCard]);

  const skip = useCallback(() => {
    if (!activeCard) {
      return;
    }
    setHistory((current) => [...current, { cardId: activeCard.id, progressBefore: progress }]);
    setActiveCardId(chooseNextCard(progress, activeCard.id)?.id ?? activeCard.id);
    leaveAnswerMode();
  }, [activeCard, chooseNextCard, leaveAnswerMode, progress]);

  const previous = useCallback(() => {
    setHistory((current) => {
      const previousEntry = current[current.length - 1];
      if (!previousEntry) {
        return current;
      }
      persist(previousEntry.progressBefore);
      setActiveCardId(previousEntry.cardId);
      leaveAnswerMode();
      return current.slice(0, -1);
    });
  }, [leaveAnswerMode, persist]);

  const grade = useCallback(
    (result: Grade) => {
      if (!activeCard) {
        return;
      }
      const nextProgress = gradeCard(progress, activeCard.id, result);
      setHistory((current) => [...current, { cardId: activeCard.id, progressBefore: progress }]);
      persist(nextProgress);
      setActiveCardId(chooseNextCard(nextProgress, activeCard.id)?.id ?? activeCard.id);
      leaveAnswerMode();
    },
    [activeCard, chooseNextCard, leaveAnswerMode, persist, progress]
  );

  const reset = useCallback(() => {
    const nextProgress = createProgress(KANA);
    persist(nextProgress);
    setActiveCardId(chooseNextCard(nextProgress)?.id ?? null);
    setHistory([]);
    leaveAnswerMode();
  }, [chooseNextCard, leaveAnswerMode, persist]);

  const setAll = useCallback(() => persistSettings(KANA.map((card) => card.id)), [persistSettings]);
  const setNone = useCallback(() => persistSettings([]), [persistSettings]);
  const setFirstFiveRows = useCallback(() => {
    const firstFive = new Set(["vowels", "k", "s", "t", "n"]);
    persistSettings(KANA.filter((card) => firstFive.has(card.groupId)).map((card) => card.id));
  }, [persistSettings]);

  const toggleIds = useCallback(
    (ids: string[], enabled: boolean) => {
      const nextIds = new Set(settings.selectedKanaIds);
      for (const id of ids) {
        if (enabled) {
          nextIds.add(id);
        } else {
          nextIds.delete(id);
        }
      }
      persistSettings(KANA.filter((card) => nextIds.has(card.id)).map((card) => card.id));
    },
    [persistSettings, settings.selectedKanaIds]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (view !== "drill" || isTypingTarget(event.target)) {
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        void reveal();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        skip();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        grade("forgot");
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        grade("remembered");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [grade, previous, reveal, skip, view]);

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <header className="topbar">
          <div>
            <p className="eyebrow">KanaLoop</p>
            <h1 id="app-title">Kana drill</h1>
          </div>
          <div className="topbar-controls">
            <div className="mode-tabs" aria-label="Choose view">
              <button className={view === "drill" ? "tab active" : "tab"} onClick={() => setView("drill")} type="button">
                Drill
              </button>
              <button
                className={view === "settings" ? "tab active" : "tab"}
                onClick={() => setView("settings")}
                type="button"
              >
                Settings
              </button>
            </div>
            <div className="mode-tabs" aria-label="Choose kana set">
              {MODES.map((item) => (
                <button
                  className={mode === item.value ? "tab active" : "tab"}
                  key={item.value}
                  onClick={() => {
                    setMode(item.value);
                    setActiveCardId(null);
                    setHistory([]);
                    leaveAnswerMode();
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {view === "drill" ? (
          <div className="drill-layout">
            <section className="prompt-panel" aria-live="polite">
              {activeCard ? (
                <>
                  <p className="script-label">{activeCard.script}</p>
                  <div className="kana-mark">{activeCard.kana}</div>
                  <div className={revealed ? "answer revealed" : "answer"}>{revealed ? activeCard.romaji : ""}</div>
                  <div className="actions">
                    {!revealed ? (
                      <button className="primary" onClick={reveal} type="button">
                        Reveal
                      </button>
                    ) : (
                      <>
                        <button className="secondary" onClick={() => grade("forgot")} type="button">
                          Forgot
                        </button>
                        <button className="primary" onClick={() => grade("remembered")} type="button">
                          Remembered
                        </button>
                      </>
                    )}
                  </div>
                  <p className="audio-state">
                    {spoken === "recording"
                      ? "Recorded pronunciation played."
                      : spoken === "tts"
                        ? "Browser pronunciation played."
                        : spoken === "unavailable" || (!speechReady && !activeCard.audioUrl)
                        ? "Speech is unavailable in this browser."
                        : "Reveal plays Japanese pronunciation."}
                  </p>
                </>
              ) : (
                <div className="empty-state">
                  <p>No kana selected for this set.</p>
                  <button className="primary" onClick={() => setView("settings")} type="button">
                    Open settings
                  </button>
                </div>
              )}
            </section>

            <aside className="progress-panel" aria-label="Progress summary">
              <div className="stat-block">
                <span>Due now</span>
                <strong>{stats.due}</strong>
              </div>
              <div className="stat-grid">
                <div>
                  <span>Selected</span>
                  <strong>{stats.total}</strong>
                </div>
                <div>
                  <span>Recognized</span>
                  <strong>
                    {stats.recognized}/{stats.total}
                  </strong>
                </div>
                <div>
                  <span>Learning</span>
                  <strong>{stats.learning}</strong>
                </div>
                <div>
                  <span>Best streak</span>
                  <strong>{stats.bestStreak}</strong>
                </div>
              </div>
              <div className="meter" aria-label={`${stats.recognized} of ${stats.total} recognized`}>
                <span style={{ width: `${stats.total ? (stats.recognized / stats.total) * 100 : 0}%` }} />
              </div>
              <button className="reset" onClick={reset} type="button">
                Reset local progress
              </button>
            </aside>
          </div>
        ) : (
          <section className="settings-panel" aria-label="Kana settings">
            <div className="settings-header">
              <div>
                <p className="eyebrow">Settings</p>
                <h2>Choose drill kana</h2>
              </div>
              <div className="settings-actions">
                <button className="secondary" onClick={setFirstFiveRows} type="button">
                  First 5 rows
                </button>
                <button className="secondary" onClick={setAll} type="button">
                  Check all
                </button>
                <button className="secondary" onClick={setNone} type="button">
                  Uncheck all
                </button>
              </div>
            </div>

            <div className="settings-grid">
              {(["hiragana", "katakana"] as const).map((script) => (
                <div className="script-settings" key={script}>
                  <h3>{script}</h3>
                  {KANA_GROUPS.filter((group) => group.script === script).map((group) => {
                    const ids = group.kana.map((card) => card.id);
                    const checkedCount = ids.filter((id) => selectedIds.has(id)).length;
                    const allChecked = checkedCount === ids.length;
                    return (
                      <section className="row-settings" key={group.id}>
                        <label className="row-toggle">
                          <input
                            checked={allChecked}
                            onChange={(event) => toggleIds(ids, event.target.checked)}
                            type="checkbox"
                          />
                          <span>{group.label}</span>
                          <small>
                            {checkedCount}/{ids.length}
                          </small>
                        </label>
                        <div className="kana-toggles">
                          {group.kana.map((card) => (
                            <label className="kana-toggle" key={card.id}>
                              <input
                                checked={selectedIds.has(card.id)}
                                onChange={(event) => toggleIds([card.id], event.target.checked)}
                                type="checkbox"
                              />
                              <span>{card.kana}</span>
                              <small>{card.romaji}</small>
                            </label>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}
