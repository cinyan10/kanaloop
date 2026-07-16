import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canSpeak, playJapanese, preloadJapanese } from "./audio";
import { KANA } from "./kana";
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
import {
  loadDailyStats,
  markDailyGoalPrompted,
  recordFinishedKana,
  saveDailyStats,
  summarizeDailyStats
} from "./stats";

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

const DAKUTEN_TABLE_ROWS = [
  { label: "g", kana: { hiragana: ["が", "ぎ", "ぐ", "げ", "ご"], katakana: ["ガ", "ギ", "グ", "ゲ", "ゴ"] } },
  { label: "z", kana: { hiragana: ["ざ", "じ", "ず", "ぜ", "ぞ"], katakana: ["ザ", "ジ", "ズ", "ゼ", "ゾ"] } },
  { label: "d", kana: { hiragana: ["だ", "ぢ", "づ", "で", "ど"], katakana: ["ダ", "ヂ", "ヅ", "デ", "ド"] } },
  { label: "b", kana: { hiragana: ["ば", "び", "ぶ", "べ", "ぼ"], katakana: ["バ", "ビ", "ブ", "ベ", "ボ"] } },
  { label: "p", kana: { hiragana: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"], katakana: ["パ", "ピ", "プ", "ペ", "ポ"] } }
] as const;

const YOON_TABLE_ROWS = [
  { label: "k", kana: { hiragana: ["きゃ", "きゅ", "きょ"], katakana: ["キャ", "キュ", "キョ"] } },
  { label: "s", kana: { hiragana: ["しゃ", "しゅ", "しょ"], katakana: ["シャ", "シュ", "ショ"] } },
  { label: "t", kana: { hiragana: ["ちゃ", "ちゅ", "ちょ"], katakana: ["チャ", "チュ", "チョ"] } },
  { label: "n", kana: { hiragana: ["にゃ", "にゅ", "にょ"], katakana: ["ニャ", "ニュ", "ニョ"] } },
  { label: "h", kana: { hiragana: ["ひゃ", "ひゅ", "ひょ"], katakana: ["ヒャ", "ヒュ", "ヒョ"] } },
  { label: "m", kana: { hiragana: ["みゃ", "みゅ", "みょ"], katakana: ["ミャ", "ミュ", "ミョ"] } },
  { label: "r", kana: { hiragana: ["りゃ", "りゅ", "りょ"], katakana: ["リャ", "リュ", "リョ"] } },
  { label: "g", kana: { hiragana: ["ぎゃ", "ぎゅ", "ぎょ"], katakana: ["ギャ", "ギュ", "ギョ"] } },
  { label: "j", kana: { hiragana: ["じゃ", "じゅ", "じょ"], katakana: ["ジャ", "ジュ", "ジョ"] } },
  { label: "b", kana: { hiragana: ["びゃ", "びゅ", "びょ"], katakana: ["ビャ", "ビュ", "ビョ"] } },
  { label: "p", kana: { hiragana: ["ぴゃ", "ぴゅ", "ぴょ"], katakana: ["ピャ", "ピュ", "ピョ"] } }
] as const;

const VOWEL_COLUMNS = ["a", "i", "u", "e", "o"] as const;
const YOON_COLUMNS = ["ya", "yu", "yo"] as const;
const RECENT_CARD_LIMIT = 2;

type HistoryEntry = {
  cardId: string;
  progressBefore: ProgressState;
};

type KanaTableRow = {
  label: string;
  cards: (Kana | null)[];
};

export default function App() {
  const [mode, setMode] = useState<DrillMode>("both");
  const [view, setView] = useState<"drill" | "settings">("drill");
  const [progress, setProgress] = useState(() => loadProgress(window.localStorage, KANA));
  const [settings, setSettings] = useState(() => loadSettings(window.localStorage, KANA));
  const [dailyStats, setDailyStats] = useState(() => loadDailyStats(window.localStorage));
  const [sessionLearningMs, setSessionLearningMs] = useState(0);
  const [sessionGoalPrompted, setSessionGoalPrompted] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputResult, setInputResult] = useState<"idle" | "correct" | "incorrect">("idle");
  const [inputLocked, setInputLocked] = useState(false);
  const [spoken, setSpoken] = useState<"idle" | "recording" | "tts" | "unavailable">("idle");
  const cardShownAt = useRef(Date.now());
  const recentCardIds = useRef<string[]>([]);
  const speechReady = canSpeak();
  const selectedIds = useMemo(() => new Set(settings.selectedKanaIds), [settings.selectedKanaIds]);

  const activeCard = useMemo(() => KANA.find((card) => card.id === activeCardId) ?? null, [activeCardId]);
  const selectedCount = useMemo(
    () => KANA.filter((card) => (mode === "both" || card.script === mode) && selectedIds.has(card.id)).length,
    [mode, selectedIds]
  );
  const statsSummary = useMemo(() => summarizeDailyStats(dailyStats), [dailyStats]);
  const learningGoalMs = settings.learningGoalMinutes * 60 * 1000;

  const persist = useCallback((nextProgress: typeof progress) => {
    setProgress(nextProgress);
    saveProgress(window.localStorage, nextProgress);
  }, []);

  const persistDailyStats = useCallback((nextStats: typeof dailyStats) => {
    setDailyStats(nextStats);
    saveDailyStats(window.localStorage, nextStats);
  }, []);

  const checkLearningGoal = useCallback(
    (nextSessionLearningMs: number, nextDailyStats: typeof dailyStats) => {
      if (learningGoalMs <= 0) {
        return nextDailyStats;
      }

      if (settings.learningGoalScope === "session") {
        if (!sessionGoalPrompted && nextSessionLearningMs >= learningGoalMs) {
          setSessionGoalPrompted(true);
          setIsGoalDialogOpen(true);
        }
        return nextDailyStats;
      }

      if (!nextDailyStats.dailyGoalPromptedAt && nextDailyStats.learningMs >= learningGoalMs) {
        setIsGoalDialogOpen(true);
        return markDailyGoalPrompted(nextDailyStats);
      }

      return nextDailyStats;
    },
    [learningGoalMs, sessionGoalPrompted, settings.learningGoalScope]
  );

  const recordLearning = useCallback(
    (cardId: string, finishedAt: number, recallMs?: number) => {
      const learningMs = Math.max(0, finishedAt - cardShownAt.current);
      const nextSessionLearningMs = sessionLearningMs + learningMs;
      const nextDailyStats = checkLearningGoal(
        nextSessionLearningMs,
        recordFinishedKana(dailyStats, cardId, learningMs, recallMs, finishedAt)
      );

      setSessionLearningMs(nextSessionLearningMs);
      persistDailyStats(nextDailyStats);
    },
    [checkLearningGoal, dailyStats, persistDailyStats, sessionLearningMs]
  );

  const chooseNextCard = useCallback(
    (nextProgress: ProgressState, excludeId?: string | null): Kana | null => {
      const excludedIds = new Set(recentCardIds.current);
      if (excludeId) {
        excludedIds.add(excludeId);
      }
      const enoughAlternatives = selectedCount > excludedIds.size;
      const pool = enoughAlternatives ? KANA.filter((card) => !excludedIds.has(card.id)) : KANA;
      return selectNextCard(pool, nextProgress, mode, Date.now(), selectedIds);
    },
    [mode, selectedCount, selectedIds]
  );

  const rememberRecentCard = useCallback((cardId: string) => {
    recentCardIds.current = [cardId, ...recentCardIds.current.filter((id) => id !== cardId)].slice(0, RECENT_CARD_LIMIT);
  }, []);

  const leaveAnswerMode = useCallback(() => {
    cardShownAt.current = Date.now();
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
    recentCardIds.current = [];
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
    const now = Date.now();
    recordLearning(activeCard.id, now);
    rememberRecentCard(activeCard.id);
    setHistory((current) => [...current, { cardId: activeCard.id, progressBefore: progress }]);
    setActiveCardId(chooseNextCard(progress, activeCard.id)?.id ?? activeCard.id);
    leaveAnswerMode();
  }, [activeCard, chooseNextCard, leaveAnswerMode, progress, recordLearning, rememberRecentCard]);

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
    (result: Grade, considerationMs?: number) => {
      if (!activeCard) {
        return;
      }
      const now = Date.now();
      const answerTime = result === "remembered" ? considerationMs ?? now - cardShownAt.current : undefined;
      const nextProgress = gradeCard(progress, activeCard.id, result, now, answerTime);
      recordLearning(activeCard.id, now, answerTime);
      rememberRecentCard(activeCard.id);
      setHistory((current) => [...current, { cardId: activeCard.id, progressBefore: progress }]);
      persist(nextProgress);
      setActiveCardId(chooseNextCard(nextProgress, activeCard.id)?.id ?? activeCard.id);
      leaveAnswerMode();
    },
    [activeCard, chooseNextCard, leaveAnswerMode, persist, progress, recordLearning, rememberRecentCard]
  );

  const submitInput = useCallback((value = inputValue) => {
    if (!activeCard || inputLocked || !value.trim()) {
      return;
    }
    const isCorrect = normalizeRomaji(value) === activeCard.romaji;
    const considerationMs = isCorrect ? Date.now() - cardShownAt.current : undefined;
    setInputLocked(true);
    setInputResult(isCorrect ? "correct" : "incorrect");
    setRevealed(true);
    void playJapanese(activeCard).then(setSpoken);
    window.setTimeout(() => grade(isCorrect ? "remembered" : "forgot", considerationMs), 650);
  }, [activeCard, grade, inputLocked, inputValue]);

  const updateInputValue = useCallback(
    (nextValue: string) => {
      setInputValue(nextValue);
      const typedRomaji = normalizeRomaji(nextValue);
      if (activeCard && typedRomaji.length >= activeCard.romaji.length) {
        submitInput(nextValue);
      }
    },
    [activeCard, submitInput]
  );

  const reset = useCallback(() => {
    const nextProgress = createProgress(KANA);
    persist(nextProgress);
    setActiveCardId(chooseNextCard(nextProgress)?.id ?? null);
    recentCardIds.current = [];
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
  const setShowStatsOnMainPage = useCallback(
    (showStatsOnMainPage: boolean) => {
      persistSettings({ ...settings, showStatsOnMainPage });
    },
    [persistSettings, settings]
  );
  const setLearningGoalMinutes = useCallback(
    (value: string) => {
      const learningGoalMinutes = value.trim() === "" ? 0 : Math.max(0, Math.floor(Number(value) || 0));
      setSessionGoalPrompted(false);
      persistSettings({ ...settings, learningGoalMinutes });
    },
    [persistSettings, settings]
  );
  const setLearningGoalScope = useCallback(
    (learningGoalScope: DrillSettings["learningGoalScope"]) => {
      setSessionGoalPrompted(false);
      persistSettings({ ...settings, learningGoalScope });
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

      if (event.key === "Escape" && isGoalDialogOpen) {
        event.preventDefault();
        setIsGoalDialogOpen(false);
        return;
      }

      if (isHelpOpen || isGoalDialogOpen) {
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
  }, [grade, inputLocked, inputValue, isGoalDialogOpen, isHelpOpen, previous, reveal, revealed, settings.inputModeEnabled, skip, submitInput, updateInputValue, view]);

  const renderKanaTable = (script: "hiragana" | "katakana", label: string, rows: KanaTableRow[]) => (
    <div className="kana-table" role="table" aria-label={`${script} ${label}`}>
      <div className="kana-table-row header" role="row">
        <span role="columnheader" />
        {VOWEL_COLUMNS.map((column) => (
          <span key={column} role="columnheader">
            {column}
          </span>
        ))}
      </div>
      {rows.map((row, rowIndex) => {
        const rowCards = row.cards.filter((card): card is Kana => Boolean(card));
        const rowIds = rowCards.map((card) => card.id);
        const checkedCount = rowIds.filter((id) => selectedIds.has(id)).length;

        return (
          <div className="kana-table-row" key={`${label}-${row.label}-${rowIndex}`} role="row">
            <label className="table-row-toggle" role="rowheader">
              <input
                checked={rowIds.length > 0 && checkedCount === rowIds.length}
                onChange={(event) => toggleIds(rowIds, event.target.checked)}
                type="checkbox"
              />
              <span>{row.label}</span>
            </label>
            {row.cards.map((card, columnIndex) =>
              card ? (
                <label className={selectedIds.has(card.id) ? "kana-table-cell selected" : "kana-table-cell"} key={card.id} role="cell">
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
              )
            )}
          </div>
        );
      })}
    </div>
  );

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
            {settings.showStatsOnMainPage ? (
              <section className="stats-strip" aria-label="Learning stats">
                <div>
                  <span>Session</span>
                  <strong>{formatLearningTime(sessionLearningMs)}</strong>
                </div>
                <div>
                  <span>Remembered today</span>
                  <strong>{statsSummary.rememberedCount}</strong>
                </div>
                <div>
                  <span>Avg today</span>
                  <strong>{formatRecallSpeed(statsSummary.averageRecallMs)}</strong>
                </div>
                <div>
                  <span>Last 10</span>
                  <strong>{formatRecallSpeed(statsSummary.recentAverageRecallMs)}</strong>
                </div>
              </section>
            ) : null}
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
                  {spoken === "unavailable" && !activeCard.audioUrl ? (
                    <p className="audio-state">
                      {activeCard.groupId === "dakuten" || activeCard.groupId === "yoon"
                        ? "Recording unavailable for this kana."
                        : "Speech is unavailable in this browser."}
                    </p>
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
                    recentCardIds.current = [];
                    setHistory([]);
                    leaveAnswerMode();
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="settings-toggle-row">
              <button
                aria-pressed={settings.inputModeEnabled}
                className={settings.inputModeEnabled ? "setting-toggle-button active" : "setting-toggle-button"}
                onClick={() => setInputMode(!settings.inputModeEnabled)}
                type="button"
              >
                Input mode
              </button>
              <button
                aria-pressed={settings.showStatsOnMainPage}
                className={settings.showStatsOnMainPage ? "setting-toggle-button active" : "setting-toggle-button"}
                onClick={() => setShowStatsOnMainPage(!settings.showStatsOnMainPage)}
                type="button"
              >
                Show stats
              </button>
            </div>
            <div className="learning-goal-settings">
              <label className="goal-minutes-field">
                <span>Learning goal</span>
                <input
                  min="0"
                  onChange={(event) => setLearningGoalMinutes(event.target.value)}
                  placeholder="0"
                  step="1"
                  type="number"
                  value={settings.learningGoalMinutes || ""}
                />
                <small>minutes</small>
              </label>
              <div className="goal-scope-tabs mode-tabs" aria-label="Learning goal scope">
                <button
                  className={settings.learningGoalScope === "daily" ? "tab active" : "tab"}
                  onClick={() => setLearningGoalScope("daily")}
                  type="button"
                >
                  Daily
                </button>
                <button
                  className={settings.learningGoalScope === "session" ? "tab active" : "tab"}
                  onClick={() => setLearningGoalScope("session")}
                  type="button"
                >
                  Session
                </button>
              </div>
            </div>

            <div className="settings-grid">
              {(["hiragana", "katakana"] as const).map((script) => {
                const normalRows = NORMAL_TABLE_ROWS.map((row) => ({
                  label: row.label,
                  cards: row.romaji.map((romaji) => (romaji ? findKana(script, row.groupId, romaji) : null))
                }));
                const dakutenRows = DAKUTEN_TABLE_ROWS.map((row) => ({
                  label: row.label,
                  cards: row.kana[script].map((kana) => findKanaByCharacter(script, kana))
                }));
                const yoonRows = YOON_TABLE_ROWS.map((row) => ({
                  label: row.label,
                  cards: row.kana[script].map((kana) => findKanaByCharacter(script, kana))
                }));
                const normalIds = normalRows.flatMap((row) => row.cards.flatMap((card) => (card ? [card.id] : [])));
                const dakutenIds = dakutenRows.flatMap((row) => row.cards.flatMap((card) => (card ? [card.id] : [])));
                const yoonIds = yoonRows.flatMap((row) => row.cards.flatMap((card) => (card ? [card.id] : [])));
                const normalCheckedCount = normalIds.filter((id) => selectedIds.has(id)).length;
                const dakutenCheckedCount = dakutenIds.filter((id) => selectedIds.has(id)).length;
                const yoonCheckedCount = yoonIds.filter((id) => selectedIds.has(id)).length;

                return (
                  <div className="script-settings" key={script}>
                    <h3>{script}</h3>
                    <label className="row-toggle section-toggle">
                      <input
                        checked={normalIds.length > 0 && normalCheckedCount === normalIds.length}
                        onChange={(event) => toggleIds(normalIds, event.target.checked)}
                        type="checkbox"
                      />
                      <span>Normal</span>
                      <small>
                        {normalCheckedCount}/{normalIds.length}
                      </small>
                    </label>
                    {renderKanaTable(script, "normal kana", normalRows)}
                    <label className="row-toggle section-toggle">
                      <input
                        checked={dakutenIds.length > 0 && dakutenCheckedCount === dakutenIds.length}
                        onChange={(event) => toggleIds(dakutenIds, event.target.checked)}
                        type="checkbox"
                      />
                      <span>Dakuten</span>
                      <small>
                        {dakutenCheckedCount}/{dakutenIds.length}
                      </small>
                    </label>
                    {renderKanaTable(script, "dakuten", dakutenRows)}
                    <label className="row-toggle section-toggle">
                      <input
                        checked={yoonIds.length > 0 && yoonCheckedCount === yoonIds.length}
                        onChange={(event) => toggleIds(yoonIds, event.target.checked)}
                        type="checkbox"
                      />
                      <span>Yoon</span>
                      <small>
                        {yoonCheckedCount}/{yoonIds.length}
                      </small>
                    </label>
                    {renderKanaTable(script, "yoon", yoonRows)}
                  </div>
                );
              })}
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
        {isGoalDialogOpen ? (
          <div className="dialog-backdrop" onClick={() => setIsGoalDialogOpen(false)}>
            <section
              aria-labelledby="goal-title"
              aria-modal="true"
              className="goal-dialog"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="dialog-header">
                <h2 id="goal-title">Goal reached</h2>
                <button aria-label="Close goal dialog" className="icon-button" onClick={() => setIsGoalDialogOpen(false)} type="button">
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <p>
                You reached your {settings.learningGoalScope} learning goal of {settings.learningGoalMinutes} minutes.
              </p>
              <button className="primary" onClick={() => setIsGoalDialogOpen(false)} type="button">
                Continue
              </button>
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

function findKanaByCharacter(script: "hiragana" | "katakana", kana: string): Kana | null {
  return KANA.find((card) => card.script === script && card.kana === kana) ?? null;
}

function normalizeRomaji(value: string): string {
  return value.trim().toLowerCase();
}

function formatLearningTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatRecallSpeed(ms: number | null): string {
  return ms === null ? "–" : `${(ms / 1000).toFixed(1)}s`;
}
