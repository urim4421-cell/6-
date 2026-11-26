import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudRain, Pause, Play, RotateCcw, Shield, Volume2, VolumeX } from 'lucide-react';
import { buildSubjectWordPool } from '../data/curriculum';
import type { LongPassage, PracticeMode, StudentProfile, Subject, SubjectFilter } from '../types';
import { calculateCpm, countTextStrokes, playFeedbackTone } from '../utils/hangul';
import { SubjectSelector } from './SubjectSelector';

interface AcidRainGameProps {
  currentStudent: StudentProfile | null;
  selectedSubject: SubjectFilter;
  customPassages: LongPassage[];
  onSelectSubject: (subject: SubjectFilter) => void;
  onRequireStudent: () => void;
  onReportTelemetry: (mode: PracticeMode, subject: SubjectFilter, liveCpm: number, liveAccuracy: number) => void;
  onCompleteSession: (payload: {
    mode: 'ACID_RAIN';
    subject: SubjectFilter;
    itemTitle: string;
    cpm: number;
    maxCpm: number;
    accuracy: number;
    durationSec: number;
    score: number;
    wordsLearned: string[];
  }) => Promise<void>;
}

type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type SpeedTier = 'NORMAL' | 'FAST';

interface RainDrop {
  id: number;
  word: string;
  subject: Subject;
  fromLongBoard: boolean;
  xPct: number;
  yPct: number;
  speedPctPerSec: number;
}

const MAX_SHIELD = 5;

export const AcidRainGame: React.FC<AcidRainGameProps> = ({
  currentStudent,
  selectedSubject,
  customPassages,
  onSelectSubject,
  onRequireStudent,
  onReportTelemetry,
  onCompleteSession,
}) => {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [speedTier, setSpeedTier] = useState<SpeedTier>('NORMAL');
  const [muted, setMuted] = useState(false);

  const [drops, setDrops] = useState<RainDrop[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shield, setShield] = useState(MAX_SHIELD);
  const [clearedWords, setClearedWords] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [hits, setHits] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string>('');
  const [elapsedSec, setElapsedSec] = useState(0);

  const dropsRef = useRef<RainDrop[]>([]);
  const shieldRef = useRef(MAX_SHIELD);
  const startedAtRef = useRef<number>(0);
  const totalStrokesRef = useRef<number>(0);
  const lastSpawnAtRef = useRef<number>(0);
  const nextDropIdRef = useRef<number>(1);
  const scoreRef = useRef<number>(0);
  const clearedWordsRef = useRef<string[]>([]);
  const hitsRef = useRef<number>(0);
  const attemptsRef = useRef<number>(0);
  const sessionSavedRef = useRef<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const wordPool = useMemo(
    () => buildSubjectWordPool(selectedSubject, customPassages),
    [selectedSubject, customPassages]
  );

  const currentLevel = Math.min(8, 1 + Math.floor(score / 400));
  const liveCpm = useMemo(() => {
    if (gameState !== 'PLAYING' || elapsedSec < 1) return 0;
    return calculateCpm(totalStrokesRef.current, elapsedSec * 1000);
  }, [gameState, elapsedSec]);

  const accuracy = attempts === 0 ? 100 : Math.round((hits / attempts) * 100);

  const finalizeGame = useCallback(async () => {
    if (sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    setGameState('GAME_OVER');
    onReportTelemetry('IDLE', selectedSubject, 0, 100);

    const durSec = Math.max(2, Math.round((Date.now() - startedAtRef.current) / 1000));
    const finalCpm = calculateCpm(totalStrokesRef.current, durSec * 1000);
    const finalAcc =
      attemptsRef.current === 0 ? 100 : Math.round((hitsRef.current / attemptsRef.current) * 100);

    if (currentStudent) {
      await onCompleteSession({
        mode: 'ACID_RAIN',
        subject: selectedSubject,
        itemTitle: `산성비 교과 단어 방어 (${selectedSubject})`,
        cpm: finalCpm,
        maxCpm: Math.round(finalCpm * 1.15),
        accuracy: finalAcc,
        durationSec: durSec,
        score: scoreRef.current,
        wordsLearned: Array.from(new Set(clearedWordsRef.current)).slice(0, 16),
      });
    }
  }, [currentStudent, onCompleteSession, onReportTelemetry, selectedSubject]);

  const spawnDrop = useCallback(() => {
    if (wordPool.length === 0) return;
    const item = wordPool[Math.floor(Math.random() * wordPool.length)];
    const lvl = 1 + Math.floor(scoreRef.current / 400);
    const baseSpeed = speedTier === 'FAST' ? 11.5 : 8.2;
    const drop: RainDrop = {
      id: nextDropIdRef.current++,
      word: item.word,
      subject: item.subject,
      fromLongBoard: item.fromLongBoard,
      xPct: 8 + Math.random() * 78,
      yPct: -4,
      speedPctPerSec: baseSpeed + (lvl - 1) * 1.3 + Math.random() * 2.2,
    };
    dropsRef.current = [...dropsRef.current, drop];
    setDrops(dropsRef.current);
  }, [wordPool, speedTier]);

  const startGame = () => {
    if (!currentStudent) {
      onRequireStudent();
      return;
    }
    dropsRef.current = [];
    shieldRef.current = MAX_SHIELD;
    scoreRef.current = 0;
    clearedWordsRef.current = [];
    totalStrokesRef.current = 0;
    hitsRef.current = 0;
    attemptsRef.current = 0;
    sessionSavedRef.current = false;
    startedAtRef.current = Date.now();
    lastSpawnAtRef.current = Date.now() - 1800;

    setDrops([]);
    setScore(0);
    setCombo(0);
    setShield(MAX_SHIELD);
    setClearedWords([]);
    setAttempts(0);
    setHits(0);
    setInputVal('');
    setLastFeedback('');
    setElapsedSec(0);
    setGameState('PLAYING');
    onReportTelemetry('ACID_RAIN', selectedSubject, 0, 100);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  // Main animation frame loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let rafId = 0;
    let lastFrame = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - lastFrame) / 1000);
      lastFrame = now;

      const lvl = 1 + Math.floor(scoreRef.current / 400);
      const spawnIntervalMs = Math.max(
        950,
        (speedTier === 'FAST' ? 1750 : 2300) - (lvl - 1) * 160
      );

      if (Date.now() - lastSpawnAtRef.current >= spawnIntervalMs && dropsRef.current.length < 9) {
        lastSpawnAtRef.current = Date.now();
        spawnDrop();
      }

      let missedCount = 0;
      const surviving: RainDrop[] = [];
      for (const d of dropsRef.current) {
        const nextY = d.yPct + d.speedPctPerSec * dt;
        if (nextY >= 92) {
          missedCount += 1;
        } else {
          surviving.push({ ...d, yPct: nextY });
        }
      }

      if (missedCount > 0) {
        const nextShield = Math.max(0, shieldRef.current - missedCount);
        shieldRef.current = nextShield;
        setShield(nextShield);
        setCombo(0);
        playFeedbackTone('miss', muted);
        setLastFeedback('단어가 바닥에 닿아 방어막이 줄었습니다.');
        if (nextShield <= 0) {
          dropsRef.current = surviving;
          setDrops(surviving);
          void finalizeGame();
          return;
        }
      }

      dropsRef.current = surviving;
      setDrops(surviving);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [gameState, speedTier, spawnDrop, muted, finalizeGame]);

  // Elapsed timer + telemetry ping
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const t = setInterval(() => {
      const sec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      setElapsedSec(sec);
      const cpm = calculateCpm(totalStrokesRef.current, sec * 1000);
      const acc =
        attemptsRef.current === 0 ? 100 : Math.round((hitsRef.current / attemptsRef.current) * 100);
      onReportTelemetry('ACID_RAIN', selectedSubject, cpm, acc);
    }, 1000);
    return () => clearInterval(t);
  }, [gameState, selectedSubject, onReportTelemetry]);

  const trySubmitWord = (candidateRaw: string, isAutoMatch = false) => {
    const word = candidateRaw.trim();
    if (!word) return;

    const matchIdx = dropsRef.current.findIndex((d) => d.word === word);
    if (matchIdx !== -1) {
      const targetDrop = dropsRef.current[matchIdx];
      dropsRef.current = dropsRef.current.filter((d) => d.id !== targetDrop.id);
      setDrops(dropsRef.current);

      const nextCombo = combo + 1;
      const gained = 100 + Math.min(100, (nextCombo - 1) * 15);
      scoreRef.current += gained;
      totalStrokesRef.current += countTextStrokes(targetDrop.word);
      hitsRef.current += 1;
      attemptsRef.current += 1;
      clearedWordsRef.current = [...clearedWordsRef.current, targetDrop.word];

      setScore(scoreRef.current);
      setCombo(nextCombo);
      setHits(hitsRef.current);
      setAttempts(attemptsRef.current);
      setClearedWords(clearedWordsRef.current);
      setInputVal('');
      setLastFeedback(`${targetDrop.word} (+${gained}점)`);
      playFeedbackTone('hit', muted);
    } else if (!isAutoMatch) {
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      setCombo(0);
      setInputVal('');
      setLastFeedback(`"${word}"와 일치하는 단어가 없습니다.`);
      playFeedbackTone('miss', muted);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    if (!isComposing && val.trim().length >= 2) {
      const exactMatch = dropsRef.current.some((d) => d.word === val.trim());
      if (exactMatch) {
        trySubmitWord(val, true);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isComposing) {
      e.preventDefault();
      trySubmitWord(inputVal, false);
    }
  };

  const shieldStatusLabel =
    shield >= 4 ? '안정' : shield >= 2 ? '주의' : '위험';

  return (
    <main className="mx-auto max-w-[1160px] px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            산성비 게임 · 2022 교과 단어 방어
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            장문 연습 보드에서 배운 국어·수학·사회·과학 핵심 단어가 산성비로 내려옵니다. 정확히 입력해 막아내세요.
          </p>
        </div>
        <SubjectSelector
          value={selectedSubject}
          onChange={(subj) => {
            onSelectSubject(subj);
            if (gameState !== 'TITLE_MENU') {
              setGameState('TITLE_MENU');
            }
          }}
        />
      </div>

      {/* Game HUD Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <div className="p-4">
          <div className="text-xs text-slate-500">점수</div>
          <div className="mt-0.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {score}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">콤보 · 단계</div>
          <div className="mt-0.5 font-mono text-2xl font-bold text-sky-700 tabular-nums">
            {combo} <span className="text-xs font-normal text-slate-500">/ Lv.{currentLevel}</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">현재 타수</div>
          <div className="mt-0.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {liveCpm} <span className="text-xs font-normal text-slate-500">타/분</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">방어막 상태</div>
          <div className="mt-1 flex items-center gap-2">
            <Shield
              className={`h-4 w-4 ${
                shield >= 4 ? 'text-emerald-600' : shield >= 2 ? 'text-amber-600' : 'text-rose-600'
              }`}
            />
            <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
              {shield}/{MAX_SHIELD}
            </span>
            <span className="text-xs font-medium text-slate-600">· {shieldStatusLabel}</span>
          </div>
        </div>
        <div className="p-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? '효과음 켜기' : '효과음 끄기'}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {gameState === 'PLAYING' && (
            <button
              type="button"
              onClick={() => setGameState('PAUSED')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
            >
              <Pause className="h-3.5 w-3.5" />
              일시정지
            </button>
          )}
          {gameState === 'PAUSED' && (
            <button
              type="button"
              onClick={() => {
                setGameState('PLAYING');
                inputRef.current?.focus();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5" />
              계속하기
            </button>
          )}
        </div>
      </section>

      {/* Main Rain Stage */}
      <section className="relative h-[460px] overflow-hidden rounded-xl border border-slate-800 bg-slate-900 select-none">
        {/* Subtle ground defense line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-10 border-t border-dashed border-rose-400/50"
        />
        <div className="absolute right-4 bottom-3 text-[11px] text-slate-400">
          바닥 방어선 · 2022 교과 단어 {wordPool.length}개 적용 중
        </div>

        {/* Falling raindrops */}
        {gameState === 'PLAYING' &&
          drops.map((drop) => (
            <div
              key={drop.id}
              style={{
                left: `${drop.xPct}%`,
                top: 0,
                transform: `translate3d(-50%, ${drop.yPct * 4.1}px, 0)`,
              }}
              className="absolute will-change-transform rounded-lg border border-sky-400/40 bg-slate-800/95 px-3.5 py-2 shadow-md"
            >
              <div className="text-[10px] font-medium text-sky-300 leading-none mb-1">
                {drop.subject}
              </div>
              <div className="text-base font-bold text-white tracking-wide whitespace-nowrap">
                {drop.word}
              </div>
            </div>
          ))}

        {/* TITLE_MENU Overlay */}
        {gameState === 'TITLE_MENU' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-6 text-center">
            <CloudRain className="h-10 w-10 text-sky-400 mb-3" />
            <h2 className="text-2xl font-bold text-white">
              {selectedSubject === '전체' ? '전 과목' : selectedSubject} 교과 단어 산성비
            </h2>
            <p className="mt-2 max-w-lg text-sm text-slate-300">
              장문 연습 보드에서 출제된 2022 개정 교육과정 핵심 단어가 하늘에서 떨어집니다. 단어를 입력하고 Enter 또는 Space를 누르세요.
            </p>
            <div className="mt-4 max-w-xl text-xs text-slate-400">
              출제 단어 예시: {wordPool.slice(0, 8).map((w) => w.word).join(' · ')}
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-lg bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setSpeedTier('NORMAL')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  speedTier === 'NORMAL' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                보통 속도
              </button>
              <button
                type="button"
                onClick={() => setSpeedTier('FAST')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  speedTier === 'FAST' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                빠른 도전
              </button>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors"
            >
              <Play className="h-4 w-4" />
              게임 시작하기
            </button>
          </div>
        )}

        {/* PAUSED Overlay */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 text-center p-6">
            <h2 className="text-xl font-bold text-white">일시정지됨</h2>
            <p className="mt-1 text-xs text-slate-300">계속하기 버튼을 눌러 방어를 이어가세요.</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setGameState('PLAYING');
                  inputRef.current?.focus();
                }}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500"
              >
                계속하기
              </button>
              <button
                type="button"
                onClick={startGame}
                className="px-4 py-2.5 text-sm font-semibold text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700"
              >
                다시 시작
              </button>
            </div>
          </div>
        )}

        {/* GAME_OVER Overlay */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-center p-6">
            <h2 className="text-2xl font-bold text-white">산성비 게임 종료</h2>
            <p className="mt-1 text-xs text-slate-300">
              최종 점수 {score}점 · 맞힌 단어 {clearedWords.length}개 · 정확도 {accuracy}%
            </p>
            {clearedWords.length > 0 && (
              <div className="mt-4 max-w-lg text-xs text-sky-300">
                복습한 교과 단어: {Array.from(new Set(clearedWords)).slice(0, 10).join(', ')}
              </div>
            )}
            <button
              type="button"
              onClick={startGame}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-500"
            >
              <RotateCcw className="h-4 w-4" />
              다시 도전하기
            </button>
          </div>
        )}
      </section>

      {/* Word Input Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center gap-3">
        <label htmlFor="acid-word-input" className="sr-only">
          산성비 단어 입력
        </label>
        <input
          id="acid-word-input"
          ref={inputRef}
          type="text"
          disabled={gameState !== 'PLAYING'}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionUpdate={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            const finalVal = e.currentTarget.value;
            setInputVal(finalVal);
            if (gameState === 'PLAYING' && finalVal.trim().length >= 2) {
              const exact = dropsRef.current.some((d) => d.word === finalVal.trim());
              if (exact) trySubmitWord(finalVal, true);
            }
          }}
          placeholder={
            gameState === 'PLAYING'
              ? '내려오는 단어를 입력하고 Enter 또는 Space를 누르세요'
              : '게임 시작 후 여기에 단어를 입력하세요'
          }
          className="flex-1 w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-lg text-slate-900 placeholder:text-sm placeholder:text-slate-400 focus:border-sky-600 focus:outline-none disabled:bg-slate-50"
        />
        <div className="w-full sm:w-56 text-xs text-slate-500 text-right truncate">
          {lastFeedback || `정확도 ${accuracy}% · 맞힌 단어 ${hits}개`}
        </div>
      </section>
    </main>
  );
};
