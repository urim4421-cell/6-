// Korean 2-bulsik Hangul decomposition & typing telemetry utilities

const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const JUNGSEONG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
];

const JONGSEONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

// Number of keystrokes on standard 2-bulsik keyboard per Jamo
const COMPOUND_CHOSEONG = new Set(['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ']);
const COMPOUND_JUNGSEONG: Record<string, string[]> = {
  'ㅘ': ['ㅗ', 'ㅏ'],
  'ㅙ': ['ㅗ', 'ㅐ'],
  'ㅚ': ['ㅗ', 'ㅣ'],
  'ㅝ': ['ㅜ', 'ㅓ'],
  'ㅞ': ['ㅜ', 'ㅔ'],
  'ㅟ': ['ㅜ', 'ㅣ'],
  'ㅢ': ['ㅡ', 'ㅣ'],
};
const COMPOUND_JONGSEONG: Record<string, string[]> = {
  'ㄲ': ['ㄱ', 'ㄱ'],
  'ㄳ': ['ㄱ', 'ㅅ'],
  'ㄵ': ['ㄴ', 'ㅈ'],
  'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'],
  'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'],
  'ㄾ': ['ㄹ', 'ㅌ'],
  'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'],
  'ㅄ': ['ㅂ', 'ㅅ'],
  'ㅆ': ['ㅅ', 'ㅅ'],
};

const JAMO_COMPAT_MAP: Record<string, string[]> = {
  ...COMPOUND_JUNGSEONG,
  ...COMPOUND_JONGSEONG,
};

export function decomposeCharToJamo(ch: string): string[] {
  if (!ch) return [];
  const code = ch.charCodeAt(0);
  // Complete Hangul syllable (가 - 힣)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const offset = code - 0xac00;
    const choIdx = Math.floor(offset / (21 * 28));
    const jungIdx = Math.floor((offset % (21 * 28)) / 28);
    const jongIdx = offset % 28;

    const result: string[] = [];
    const cho = CHOSEONG[choIdx];
    result.push(cho);

    const jung = JUNGSEONG[jungIdx];
    if (COMPOUND_JUNGSEONG[jung]) {
      result.push(...COMPOUND_JUNGSEONG[jung]);
    } else {
      result.push(jung);
    }

    if (jongIdx > 0) {
      const jong = JONGSEONG[jongIdx];
      if (COMPOUND_JONGSEONG[jong]) {
        result.push(...COMPOUND_JONGSEONG[jong]);
      } else {
        result.push(jong);
      }
    }
    return result;
  }

  // Compatibility Jamo (ㄱ - ㅣ)
  if (code >= 0x3131 && code <= 0x3163) {
    return JAMO_COMPAT_MAP[ch] ? [...JAMO_COMPAT_MAP[ch]] : [ch];
  }

  return [ch];
}

export function countCharStrokes(ch: string): number {
  if (!ch) return 0;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const offset = code - 0xac00;
    const choIdx = Math.floor(offset / (21 * 28));
    const jungIdx = Math.floor((offset % (21 * 28)) / 28);
    const jongIdx = offset % 28;

    let strokes = 0;
    const cho = CHOSEONG[choIdx];
    strokes += COMPOUND_CHOSEONG.has(cho) ? 2 : 1; // Shift counts as extra effort or 1 key; standard Hancom counts 1 per key press (double consonant = 1 key with shift, or 2 strokes). Using 1+1 for double/compound feels natural.
    const jung = JUNGSEONG[jungIdx];
    strokes += COMPOUND_JUNGSEONG[jung] ? 2 : 1;
    if (jongIdx > 0) {
      const jong = JONGSEONG[jongIdx];
      strokes += COMPOUND_JONGSEONG[jong] ? 2 : 1;
    }
    return strokes;
  }
  return 1;
}

export function countTextStrokes(text: string): number {
  let total = 0;
  for (const ch of text) {
    total += countCharStrokes(ch);
  }
  return total;
}

/**
 * Checks if `typedChar` (currently under IME composition) is a valid prefix of `targetChar`.
 * For example, target = '한' ([ㅎ,ㅏ,ㄴ]), typed = '하' ([ㅎ,ㅏ]) -> true.
 */
export function isComposingPrefix(targetChar: string, typedChar: string): boolean {
  if (!targetChar || !typedChar) return false;
  if (targetChar === typedChar) return true;
  const targetJamo = decomposeCharToJamo(targetChar);
  const typedJamo = decomposeCharToJamo(typedChar);
  if (typedJamo.length > targetJamo.length) return false;
  for (let i = 0; i < typedJamo.length; i++) {
    if (typedJamo[i] !== targetJamo[i]) {
      return false;
    }
  }
  return true;
}

export type CharState = 'correct' | 'incorrect' | 'composing' | 'pending';

export interface TypingEvaluation {
  charStates: CharState[];
  correctChars: number;
  errorChars: number;
  completedCorrectStrokes: number;
  accuracy: number;
  isComplete: boolean;
}

export function evaluateTypingProgress(
  target: string,
  typed: string,
  isComposing: boolean
): TypingEvaluation {
  const charStates: CharState[] = new Array(target.length).fill('pending');
  let correctChars = 0;
  let errorChars = 0;
  let completedCorrectStrokes = 0;

  const activeIdx = isComposing && typed.length > 0 ? typed.length - 1 : -1;

  for (let i = 0; i < target.length; i++) {
    if (i >= typed.length) {
      charStates[i] = 'pending';
      continue;
    }
    const tChar = target[i];
    const uChar = typed[i];

    if (i === activeIdx) {
      if (uChar === tChar) {
        charStates[i] = 'correct';
        correctChars++;
        completedCorrectStrokes += countCharStrokes(tChar);
      } else if (isComposingPrefix(tChar, uChar)) {
        charStates[i] = 'composing';
        completedCorrectStrokes += countCharStrokes(uChar);
      } else {
        charStates[i] = 'incorrect';
        errorChars++;
      }
    } else {
      if (uChar === tChar) {
        charStates[i] = 'correct';
        correctChars++;
        completedCorrectStrokes += countCharStrokes(tChar);
      } else {
        charStates[i] = 'incorrect';
        errorChars++;
      }
    }
  }

  // Extra trailing characters beyond target count as errors
  if (typed.length > target.length) {
    errorChars += typed.length - target.length;
  }

  const judgedCount = correctChars + errorChars;
  const accuracy = judgedCount === 0 ? 100 : Math.max(0, Math.round((correctChars / judgedCount) * 100));
  const isComplete = !isComposing && typed.length >= target.length && typed.slice(0, target.length) === target;

  return {
    charStates,
    correctChars,
    errorChars,
    completedCorrectStrokes,
    accuracy,
    isComplete,
  };
}

export function calculateCpm(strokes: number, elapsedMs: number): number {
  if (elapsedMs < 800 || strokes <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.min(1200, Math.round(strokes / minutes));
}

// Gentle Web Audio API synthesized sound feedback
let audioCtx: AudioContext | null = null;

export function playFeedbackTone(
  type: 'hit' | 'miss' | 'complete' | 'countdown' | 'victory',
  muted = false
): void {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'hit') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'miss') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (type === 'countdown') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'complete' || type === 'victory') {
      const notes = type === 'victory' ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        if (!audioCtx) return;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.08, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.24);
      });
    }
  } catch {
    // Ignore audio errors when autoplay policy restricts context
  }
}
