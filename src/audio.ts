import type { Kana } from "./kana";

export type PlaybackResult = "recording" | "tts" | "unavailable";

let activeAudio: HTMLAudioElement | null = null;
const audioCache = new Map<string, string>();

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export async function playJapanese(card: Pick<Kana, "kana" | "audioUrl">): Promise<PlaybackResult> {
  stopAudio();

  if (card.audioUrl) {
    try {
      preloadJapanese(card);
      activeAudio = new Audio(audioCache.get(card.audioUrl) ?? card.audioUrl);
      activeAudio.preload = "auto";
      await activeAudio.play();
      return "recording";
    } catch {
      stopAudio();
      return "unavailable";
    }
  }

  return speakJapanese(card.kana) ? "tts" : "unavailable";
}

export function preloadJapanese(card: Pick<Kana, "audioUrl">): void {
  if (!card.audioUrl || audioCache.has(card.audioUrl) || typeof document === "undefined") {
    return;
  }

  const audio = document.createElement("audio");
  audio.src = card.audioUrl;
  audio.preload = "auto";
  audio.load();
  audioCache.set(card.audioUrl, audio.src);
}

function speakJapanese(text: string): boolean {
  if (!canSpeak()) {
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
  return true;
}

function stopAudio(): void {
  window.speechSynthesis?.cancel();
  if (!activeAudio) {
    return;
  }
  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeAudio = null;
}
