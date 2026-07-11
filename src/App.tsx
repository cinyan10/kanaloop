import { useCallback, useEffect, useMemo, useState } from "react";
import { canSpeak, playJapanese, preloadJapanese } from "./audio";
import { KANA, KANA_GROUPS } from "./kana";
import type { Kana } from "./kana";
import { createSettings, loadSettings, saveSettings } from "./settings";
import type { DrillSettings } from "./settings";
import type { DrillMode, Grade, ProgressState } from "./scheduler";
import {
  createProgress,
  gradeCard,
  loadProgress,
  saveProgress,
  selectNextCard
} from "./scheduler";

const MODES: { label: string; value: DrillMode }[] = [
  { label: "Both", value: "both" },
  { label: "Hiragana", value: "hiragana" },
  { label: "Katakana", value: "katakana" }
];

const NORMAL_TABLE_ROWS = [
  { label: "∅", groupId: "vowels", romaji: ["a", "i", "u", "e", "o"] },
  { label: "k", groupId: "k", romaji: ["ka", "ki", "ku", "ke", "ko"] },
  { label: "s", groupId: "s", romaji: ["sa", "shi", "su", "se", "so"] },
  { label: "t", groupId: "t", romaji: ["ta", "chi", "tsu", "te", "to"] },
  { label: "n", groupId: "n", romaji: ["na", "ni", "nu", "ne", "no"] },
  { label: "h", groupId: "h", romaji: ["ha", "hi", "fu", "he", "ho"] },
  { label: "m", groupId: "m", romaji: ["ma", "mi", "mu", "me", "mo"] },
  { label: "y", groupId: "y", romaji: ["ya", null, "yu", null, "yo"] },
  { label: "r", groupId: "r", romaji: ["ra", "ri", "ru", "re", "ro"] },
  { label: "w", groupId: "w-n", romaji: ["wa", null, null, null, "wo"] },
  { label: "n", groupId: "w-n", romaji: [null, null, "n", null, null] }
] as const;

const VOWEL_COLUMNS = ["a", "i", "u", "e", "o"] as const;

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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputResult, setInputResult] = useState<"idle" | "correct" | "incorrect">("idle");
  const [inputLocked, setInputLocked] = useState(false);
  const [spoken, setSpoken] = useState<"idle" | "recording" | "tts" | "unavailable">("idle");
  const speechReady = canSpeak();
  const selectedIds = useMemo(() => new Set(settings.selectedKanaIds), [settings.selectedKanaIds]);

  const activeCard = useMemo(() => KANA.find((card) => card.id === activeCardId) ?? null, [activeCardId]);
  const selectedCount = useMemo(
    () => KANA.filter((card) => (mode === "both" || card.script === mode) && selectedIds.has(card.id)).length,
    [mode, selectedIds]
  );

  const persist = useCallback((nextProgress: typeof progress) => {
    setProgress(nextProgress);
    saveProgress(window.localStorage, nextProgress);
  }, []);

  const chooseNextCard = useCallback(
    (nextProgress: ProgressState, excludeId?: string | null): Kana | null => {
      const pool = excludeId && selectedCount > 1 ? KANA.filter((card) => card.id !== excludeId) : KANA;
      return selectNextCard(pool, nextProgress, mode, Date.now(), selectedIds);
    },
    [mode, selectedCount, selectedIds]
  );

  const leaveAnswerMode = useCallback(() => {
    setRevealed(false);
    setInputValue("");
    setInputResult("idle");
    setInputLocked(false);
    setSpoken("idle");
  }, []);

  const persistSettings = useCallback((nextSettings: DrillSettings) => {
    setSettings(nextSettings);
    saveSettings(window.localStorage, nextSettings);
    setActiveCardId(null);
    setHistory([]);
    leaveAnswerMode();
  }, [leaveAnswerMode]);

  const updateSelectedKana = useCallback(
    (selectedKanaIds: string[]) => {
      persistSettings({ ...settings, selectedKanaIds });
    },
    [persistSettings, settings]
  );

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

  const submitInput = useCallback((value = inputValue) => {
    if (!activeCard || inputLocked || !value.trim()) {
      return;
    }
    const isCorrect = normalizeRomaji(value) === activeCard.romaji;
    setInputLocked(true);
    setInputResult(isCorrect ? "correct" : "incorrect");
    setRevealed(true);
    void playJapanese(activeCard).then(setSpoken);
    window.setTimeout(() => grade(isCorrect ? "remembered" : "forgot"), 650);
  }, [activeCard, grade, inputLocked, inputValue]);

  const updateInputValue = useCallback(
    (nextValue: string) => {
      setInputValue(nextValue);
      if (activeCard && normalizeRomaji(nextValue) === activeCard.romaji) {
        submitInput(nextValue);
      }
    },
    [activeCard, submitInput]
  );

  const reset = useCallback(() => {
    const nextProgress = createProgress(KANA);
    persist(nextProgress);
    setActiveCardId(chooseNextCard(nextProgress)?.id ?? null);
    setHistory([]);
    leaveAnswerMode();
  }, [chooseNextCard, leaveAnswerMode, persist]);

  const setAll = useCallback(() => updateSelectedKana(KANA.map((card) => card.id)), [updateSelectedKana]);
  const setNone = useCallback(() => updateSelectedKana([]), [updateSelectedKana]);
  const setInputMode = useCallback(
    (inputModeEnabled: boolean) => {
      persistSettings({ ...settings, inputModeEnabled });
    },
    [persistSettings, settings]
  );

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
      updateSelectedKana(KANA.filter((card) => nextIds.has(card.id)).map((card) => card.id));
    },
    [settings.selectedKanaIds, updateSelectedKana]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isHelpOpen) {
        event.preventDefault();
        setIsHelpOpen(false);
        return;
      }

      if (isHelpOpen) {
        return;
      }

      if (view !== "drill") {
        return;
      }

      if (event.defaultPrevented) {
        return;
      }

      const targetIsInput = isTypingTarget(event.target);

      if (targetIsInput && !(settings.inputModeEnabled && event.target instanceof HTMLInputElement)) {
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        if (settings.inputModeEnabled && inputValue.trim()) {
          submitInput();
          return;
        }
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
        if (!revealed) {
          void reveal();
          return;
        }
        grade("forgot");
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!revealed) {
          void reveal();
          return;
        }
        grade("remembered");
        return;
      }

      if (settings.inputModeEnabled && !inputLocked && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key === "Backspace") {
          event.preventDefault();
          updateInputValue(inputValue.slice(0, -1));
          return;
        }

        if (/^[a-zA-Z-]$/.test(event.key)) {
          event.preventDefault();
          updateInputValue(inputValue + event.key.toLowerCase());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [grade, inputLocked, inputValue, isHelpOpen, previous, reveal, revealed, settings.inputModeEnabled, skip, submitInput, updateInputValue, view]);

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <nav className="navbar" aria-label="Primary">
          <button
            aria-label="Home"
            className={view === "drill" ? "icon-button active" : "icon-button"}
            onClick={() => setView("drill")}
            title="Home"
            type="button"
          >
            <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
              <path d="m3 11 9-8 9 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M5 10v10h14V10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M9 20v-6h6v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
          <h1 id="app-title">KanaLoop</h1>
          <div className="nav-actions">
            <button
              aria-label="Shortcut guide"
              className="icon-button"
              onClick={() => setIsHelpOpen(true)}
              title="Shortcut guide"
              type="button"
            >
              <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path d="M9.1 9a3 3 0 1 1 5.8 1c-.6 1.4-2.9 1.7-2.9 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M12 17h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
            <button
              aria-label="Settings"
              className={view === "settings" ? "icon-button active" : "icon-button"}
              onClick={() => setView("settings")}
              title="Settings"
              type="button"
            >
              <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.17.39.38.72.6 1 .3.26.7.4 1.1.4H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
        </nav>

        {view === "drill" ? (
          <div className="drill-layout">
            <section className="prompt-panel" aria-live="polite">
              {activeCard ? (
                <>
                  <p className="script-label">{activeCard.script}</p>
                  <div className="kana-mark">{activeCard.kana}</div>
                  {settings.inputModeEnabled ? (
                    <input
                      aria-label="Type romaji answer"
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect="off"
                      autoFocus
                      className={`romaji-input ${inputResult}`}
                      disabled={inputLocked}
                      key={activeCard.id}
                      onChange={(event) => updateInputValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === " " || event.key === "Enter") {
                          event.preventDefault();
                          submitInput();
                        }
                      }}
                      spellCheck={false}
                      type="text"
                      value={inputValue}
                    />
                  ) : null}
                  <div className={revealed ? "answer revealed" : "answer"}>{revealed ? activeCard.romaji : ""}</div>
                  <div className={settings.inputModeEnabled ? "actions input-actions" : "actions"}>
                    {settings.inputModeEnabled ? (
                      <div className={`input-feedback ${inputResult}`} aria-live="polite">
                        {inputResult === "correct" ? "✓" : inputResult === "incorrect" ? "×" : ""}
                      </div>
                    ) : !revealed ? (
                      <button className="primary" onClick={reveal} type="button">
                        Reveal
                      </button>
                    ) : (
                      <div className="grade-actions" aria-label="Grade answer">
                        <button aria-label="Forgot" className="grade-button forgot" onClick={() => grade("forgot")} type="button">
                          <span aria-hidden="true">×</span>
                        </button>
                        <button
                          aria-label="Remembered"
                          className="grade-button remembered"
                          onClick={() => grade("remembered")}
                          type="button"
                        >
                          <span aria-hidden="true">✓</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {spoken === "unavailable" && !speechReady && !activeCard.audioUrl ? (
                    <p className="audio-state">Speech is unavailable in this browser.</p>
                  ) : null}
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
          </div>
        ) : (
          <section className="settings-panel" aria-label="Kana settings">
            <div className="settings-header">
              <div>
                <p className="eyebrow">Settings</p>
                <h2>Choose drill kana</h2>
              </div>
              <div className="settings-actions">
                <button className="secondary" onClick={setAll} type="button">
                  Check all
                </button>
                <button className="secondary" onClick={setNone} type="button">
                  Uncheck all
                </button>
              </div>
            </div>
            <div className="settings-mode-tabs mode-tabs" aria-label="Choose kana set">
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
            <button
              aria-pressed={settings.inputModeEnabled}
              className={settings.inputModeEnabled ? "setting-toggle-button active" : "setting-toggle-button"}
              onClick={() => setInputMode(!settings.inputModeEnabled)}
              type="button"
            >
              Input mode
            </button>

            <div className="settings-grid">
              {(["hiragana", "katakana"] as const).map((script) => (
                <div className="script-settings" key={script}>
                  <h3>{script}</h3>
                  <div className="kana-table" role="table" aria-label={`${script} normal kana`}>
                    <div className="kana-table-row header" role="row">
                      <span role="columnheader" />
                      {VOWEL_COLUMNS.map((column) => (
                        <span key={column} role="columnheader">
                          {column}
                        </span>
                      ))}
                    </div>
                    {NORMAL_TABLE_ROWS.map((row, rowIndex) => {
                      const rowCards = row.romaji
                        .map((romaji) => (romaji ? findKana(script, row.groupId, romaji) : null))
                        .filter((card): card is Kana => Boolean(card));
                      const rowIds = rowCards.map((card) => card.id);
                      const checkedCount = rowIds.filter((id) => selectedIds.has(id)).length;
                      return (
                        <div className="kana-table-row" key={`${row.label}-${rowIndex}`} role="row">
                          <label className="table-row-toggle" role="rowheader">
                            <input
                              checked={rowIds.length > 0 && checkedCount === rowIds.length}
                              onChange={(event) => toggleIds(rowIds, event.target.checked)}
                              type="checkbox"
                            />
                            <span>{row.label}</span>
                          </label>
                          {row.romaji.map((romaji, columnIndex) => {
                            const card = romaji ? findKana(script, row.groupId, romaji) : null;
                            return card ? (
                              <label
                                className={selectedIds.has(card.id) ? "kana-table-cell selected" : "kana-table-cell"}
                                key={card.id}
                                role="cell"
                              >
                                <input
                                  checked={selectedIds.has(card.id)}
                                  onChange={(event) => toggleIds([card.id], event.target.checked)}
                                  type="checkbox"
                                />
                                <span>{card.kana}</span>
                                <small>{card.romaji}</small>
                              </label>
                            ) : (
                              <span className="kana-table-cell empty" key={`${row.label}-${columnIndex}`} role="cell" />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {KANA_GROUPS.filter((group) => group.script === script && group.id.endsWith(":dakuten")).map((group) => {
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
                            <label className={selectedIds.has(card.id) ? "kana-toggle selected" : "kana-toggle"} key={card.id}>
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
            <div className="settings-footer">
              <button className="reset" onClick={reset} type="button">
                Reset progress
              </button>
            </div>
          </section>
        )}
        {isHelpOpen ? (
          <div className="dialog-backdrop" onClick={() => setIsHelpOpen(false)}>
            <section
              aria-labelledby="shortcut-title"
              aria-modal="true"
              className="shortcut-dialog"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="dialog-header">
                <h2 id="shortcut-title">Shortcuts</h2>
                <button aria-label="Close shortcut guide" className="icon-button" onClick={() => setIsHelpOpen(false)} type="button">
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <dl className="shortcut-list">
                <div>
                  <dt>Space</dt>
                  <dd>Reveal answer</dd>
                </div>
                <div>
                  <dt>→</dt>
                  <dd>Skip card</dd>
                </div>
                <div>
                  <dt>←</dt>
                  <dd>Previous card</dd>
                </div>
                <div>
                  <dt>↑</dt>
                  <dd>Forgot</dd>
                </div>
                <div>
                  <dt>↓</dt>
                  <dd>Remembered</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : null}
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

function findKana(script: "hiragana" | "katakana", groupId: string, romaji: string): Kana | null {
  return KANA.find((card) => card.script === script && card.groupId === groupId && card.romaji === romaji) ?? null;
}

function normalizeRomaji(value: string): string {
  return value.trim().toLowerCase();
}

