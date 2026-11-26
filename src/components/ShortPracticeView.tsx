import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';
import { SHORT_SENTENCES } from '../data/curriculum';
import type { DifficultyLevel, PracticeMode, StudentProfile, SubjectFilter } from '../types';
import {
  calculateCpm,
  countTextStrokes,
  evaluateTypingProgress,
  playFeedbackTone,
} from '../utils/hangul';
import { SubjectSelector } from './SubjectSelector';

interface ShortPracticeViewProps {
  currentStudent: StudentProfile | null;
  selectedSubject: SubjectFilter;
  onSelectSubject: (subject: SubjectFilter) => void;
  onRequireStudent: () => void;
  onReportTelemetry: (mode: PracticeMode, subject: SubjectFilter, liveCpm: number, liveAccuracy: number) => void;
  onCompleteSession: (payload: {
    mode: 'SHORT';
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

const LEVEL_LABELS: Array<{ level: DifficultyLevel; label: string; desc: string }> = [
  { level: 1, label: '1단계 기초', desc: '짧고 리듬감 있는 기본 문장' },
  { level: 2, label: '2단계 도약', desc: '교과 핵심 개념 문장' },
  { level: 3, label: '3단계 숙달', desc: '복합 자모와 긴 호흡 문장' },
];

export const ShortPracticeView: React.FC<ShortPracticeViewProps> = ({
  currentStudent,
  selectedSubject,
  onSelectSubject,
  onRequireStudent,
  onReportTelemetry,
  onCompleteSession,
}) => {
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [maxCpm, setMaxCpm] = useState(0);
  const [sessionStats, setSessionStats] = useState<Array<{ cpm: number; accuracy: number; word: string }>>([]);
  const [setCompleteSummary, setSetCompleteSummary] = useState<{
    avgCpm: number;
    maxCpm: number;
    accuracy: number;
    count: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const queue = useMemo(() => {
    return SHORT_SENTENCES.filter((s) => {
      const matchSubj = selectedSubject === '전체' || s.subject === selectedSubject;
      const matchLevel = s.level === level;
      return matchSubj && matchLevel;
    });
  }, [selectedSubject, level]);

  const currentSentence = queue[index % Math.max(1, queue.length)];
  const nextSentence = queue.length > 1 ? queue[(index + 1) % queue.length] : null;

  // Reset when subject or level changes
  useEffect(() => {
    setIndex(0);
    setTyped('');
    setStartedAt(null);
    setMaxCpm(0);
    setSessionStats([]);
    setSetCompleteSummary(null);
  }, [selectedSubject, level]);

  const evaluation = useMemo(() => {
    if (!currentSentence) {
      return {
        charStates: [],
        correctChars: 0,
        errorChars: 0,
        completedCorrectStrokes: 0,
        accuracy: 100,
        isComplete: false,
      };
    }
    return evaluateTypingProgress(currentSentence.text, typed, isComposing);
  }, [currentSentence, typed, isComposing]);

  const elapsedMs = startedAt ? Math.max(1, nowMs - startedAt) : 0;
  const currentCpm = calculateCpm(evaluation.completedCorrectStrokes, elapsedMs);

  // Live timer & telemetry ping
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    if (currentCpm > maxCpm) {
      setMaxCpm(currentCpm);
    }
  }, [currentCpm, maxCpm]);

  useEffect(() => {
    if (!startedAt) return;
    const ping = setInterval(() => {
      onReportTelemetry('SHORT', selectedSubject, currentCpm, evaluation.accuracy);
    }, 1500);
    return () => clearInterval(ping);
  }, [startedAt, selectedSubject, currentCpm, evaluation.accuracy, onReportTelemetry]);

  const advanceSentence = async () => {
    if (!currentSentence || !startedAt) return;
    const finalElapsed = Math.max(900, Date.now() - startedAt);
    const totalStrokes = countTextStrokes(currentSentence.text);
    const finalCpm = calculateCpm(totalStrokes, finalElapsed);
    const finalAcc = evaluation.accuracy;
    const updatedStats = [
      ...sessionStats,
      { cpm: finalCpm, accuracy: finalAcc, word: currentSentence.keyWord },
    ];
    setSessionStats(updatedStats);
    playFeedbackTone('complete');

    const nextIdx = index + 1;
    if (nextIdx >= queue.length) {
      const avgCpm = Math.round(
        updatedStats.reduce((sum, s) => sum + s.cpm, 0) / updatedStats.length
      );
      const avgAcc = Math.round(
        updatedStats.reduce((sum, s) => sum + s.accuracy, 0) / updatedStats.length
      );
      const peakCpm = Math.max(maxCpm, ...updatedStats.map((s) => s.cpm));
      setSetCompleteSummary({
        avgCpm,
        maxCpm: peakCpm,
        accuracy: avgAcc,
        count: updatedStats.length,
      });

      if (currentStudent) {
        await onCompleteSession({
          mode: 'SHORT',
          subject: selectedSubject,
          itemTitle: `${level}단계 단문 연습 (${selectedSubject})`,
          cpm: avgCpm,
          maxCpm: peakCpm,
          accuracy: avgAcc,
          durationSec: Math.max(5, Math.round(finalElapsed / 1000) * updatedStats.length),
          score: avgCpm,
          wordsLearned: updatedStats.map((s) => s.word),
        });
      }
      onReportTelemetry('IDLE', selectedSubject, 0, 100);
    } else {
      setIndex(nextIdx);
      setTyped('');
      setStartedAt(null);
      setMaxCpm(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentStudent) {
      onRequireStudent();
      return;
    }
    const val = e.target.value;
    if (!startedAt && val.length > 0) {
      const now = Date.now();
      setStartedAt(now);
      setNowMs(now);
      onReportTelemetry('SHORT', selectedSubject, 0, 100);
    }
    setTyped(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing && currentSentence) {
      if (typed.length >= currentSentence.text.length - 1 && evaluation.accuracy >= 60) {
        e.preventDefault();
        void advanceSentence();
      }
    }
  };

  // Auto-advance once sentence is typed completely and accurately
  useEffect(() => {
    if (evaluation.isComplete && currentSentence && typed === currentSentence.text) {
      const t = setTimeout(() => {
        void advanceSentence();
      }, 180);
      return () => clearTimeout(t);
    }
  }, [evaluation.isComplete, typed, currentSentence]);

  const handleRestartSet = () => {
    setIndex(0);
    setTyped('');
    setStartedAt(null);
    setMaxCpm(0);
    setSessionStats([]);
    setSetCompleteSummary(null);
    inputRef.current?.focus();
  };

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">수준별 단문 타자 연습</h1>
          <p className="mt-1 text-sm text-slate-600">
            1단계 기초부터 3단계 숙달까지 교과 핵심 문장으로 정확도와 타속을 높여 보세요.
          </p>
        </div>
        <SubjectSelector value={selectedSubject} onChange={onSelectSubject} />
      </div>

      {/* Level segmented control */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
          {LEVEL_LABELS.map((item) => {
            const active = level === item.level;
            return (
              <button
                key={item.level}
                type="button"
                onClick={() => setLevel(item.level)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-slate-500">
          {LEVEL_LABELS.find((l) => l.level === level)?.desc} · 문장 {Math.min(index + 1, queue.length)} / {queue.length}
        </div>
      </div>

      {/* Live Metrics Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <div className="p-4">
          <div className="text-xs text-slate-500">현재 타수</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {currentCpm} <span className="text-xs font-normal text-slate-500">타/분</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">최고 타수</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-sky-700 tabular-nums">
            {Math.max(maxCpm, currentCpm)} <span className="text-xs font-normal text-slate-500">타/분</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">정확도</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {evaluation.accuracy}%
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">완료 문장</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {sessionStats.length} / {queue.length}
          </div>
        </div>
      </section>

      {setCompleteSummary ? (
        <section className="rounded-xl border border-emerald-200 bg-white p-8 text-center space-y-5">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {level}단계 단문 연습 완료
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {currentStudent
                ? `${currentStudent.name} 학생의 기록이 교사 대시보드에 저장되었습니다.`
                : '학생 접속 후 연습하면 기록이 자동 저장됩니다.'}
            </p>
          </div>
          <div className="mx-auto max-w-md grid grid-cols-3 gap-4 border-y border-slate-100 py-4">
            <div>
              <div className="text-xs text-slate-500">평균 타수</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {setCompleteSummary.avgCpm}타
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">최고 타수</div>
              <div className="mt-1 font-mono text-xl font-bold text-sky-700 tabular-nums">
                {setCompleteSummary.maxCpm}타
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">평균 정확도</div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums">
                {setCompleteSummary.accuracy}%
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleRestartSet}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              <RotateCcw className="h-4 w-4" />
              다시 연습하기
            </button>
            {level < 3 && (
              <button
                type="button"
                onClick={() => setLevel((level + 1) as DifficultyLevel)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700"
              >
                {level + 1}단계 도전하기
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      ) : currentSentence ? (
        <section className="rounded-xl border border-slate-200 bg-white p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {currentSentence.subject} · {level}단계 · 핵심어: <strong className="text-slate-800">{currentSentence.keyWord}</strong>
            </span>
            <button
              type="button"
              onClick={handleRestartSet}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              처음부터
            </button>
          </div>

          {/* Target sentence display */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-6 py-7 cursor-text"
          >
            <div className="text-2xl sm:text-[26px] font-medium leading-relaxed tracking-wide break-keep">
              {currentSentence.text.split('').map((ch, idx) => {
                const st = evaluation.charStates[idx] || 'pending';
                let cls = 'text-slate-400';
                if (st === 'correct') cls = 'text-emerald-700 font-semibold';
                else if (st === 'composing') cls = 'text-sky-700 underline decoration-2 underline-offset-4';
                else if (st === 'incorrect') cls = 'text-rose-700 bg-rose-100 rounded px-0.5';

                const isCursor = idx === typed.length;
                return (
                  <span
                    key={idx}
                    className={`${cls} ${isCursor ? 'border-b-2 border-sky-600' : ''}`}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Input box */}
          <div className="space-y-2">
            <label htmlFor="short-typing-input" className="sr-only">
              단문 입력창
            </label>
            <input
              id="short-typing-input"
              ref={inputRef}
              type="text"
              autoFocus
              value={typed}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionUpdate={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                setTyped(e.currentTarget.value);
              }}
              placeholder={
                currentStudent
                  ? '위 문장을 보고 그대로 입력하세요 (완료 시 자동 이동, Enter로 다음 문장)'
                  : '클릭하여 학생 접속 후 타자 연습을 시작하세요'
              }
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-5 py-4 text-xl text-slate-900 placeholder:text-slate-400 placeholder:text-sm focus:border-sky-600 focus:outline-none"
            />
          </div>

          {nextSentence && (
            <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-600 shrink-0">다음 문장</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{nextSentence.text}</span>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
};
