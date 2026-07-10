import { useCallback, useMemo, useState } from "react";
import { canSpeak, speakJapanese } from "./audio";
import { KANA } from "./kana";
import type { DrillMode, Grade } from "./scheduler";
import {
  clearProgress,
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

export default function App() {
  const [mode, setMode] = useState<DrillMode>("both");
  const [progress, setProgress] = useState(() => loadProgress(window.localStorage, KANA));
  const [revealed, setRevealed] = useState(false);
  const [spoken, setSpoken] = useState<"idle" | "played" | "unavailable">("idle");
  const speechReady = canSpeak();

  const activeCard = useMemo(() => selectNextCard(KANA, progress, mode), [progress, mode]);
  const stats = useMemo(() => summarize(KANA, progress, mode), [progress, mode]);

  const persist = useCallback((nextProgress: typeof progress) => {
    setProgress(nextProgress);
    saveProgress(window.localStorage, nextProgress);
  }, []);

  const reveal = useCallback(() => {
    if (!activeCard) {
      return;
    }
    setRevealed(true);
    setSpoken(speakJapanese(activeCard.kana) ? "played" : "unavailable");
  }, [activeCard]);

  const grade = useCallback(
    (result: Grade) => {
      if (!activeCard) {
        return;
      }
      persist(gradeCard(progress, activeCard.id, result));
      setRevealed(false);
      setSpoken("idle");
    },
    [activeCard, persist, progress]
  );

  const reset = useCallback(() => {
    persist(createProgress(KANA));
    setRevealed(false);
    setSpoken("idle");
  }, [persist]);

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <header className="topbar">
          <div>
            <p className="eyebrow">KanaLoop</p>
            <h1 id="app-title">Kana drill</h1>
          </div>
          <div className="mode-tabs" aria-label="Choose kana set">
            {MODES.map((item) => (
              <button
                className={mode === item.value ? "tab active" : "tab"}
                key={item.value}
                onClick={() => {
                  setMode(item.value);
                  setRevealed(false);
                  setSpoken("idle");
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

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
                  {spoken === "played"
                    ? "Pronunciation played."
                    : spoken === "unavailable" || !speechReady
                      ? "Speech is unavailable in this browser."
                      : "Reveal plays Japanese pronunciation."}
                </p>
              </>
            ) : (
              <p>No kana available for this set.</p>
            )}
          </section>

          <aside className="progress-panel" aria-label="Progress summary">
            <div className="stat-block">
              <span>Due now</span>
              <strong>{stats.due}</strong>
            </div>
            <div className="stat-grid">
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
      </section>
    </main>
  );
}
