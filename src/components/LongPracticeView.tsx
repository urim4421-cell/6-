import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, CloudRain, Flag, RotateCcw } from 'lucide-react';
import { LONG_PASSAGES } from '../data/curriculum';
import type { AppTab, LongPassage, PracticeMode, StudentProfile, SubjectFilter } from '../types';
import {
  calculateCpm,
  countTextStrokes,
  evaluateTypingProgress,
  playFeedbackTone,
} from '../utils/hangul';
import { SubjectSelector } from './SubjectSelector';

interface LongPracticeViewProps {
  currentStudent: StudentProfile | null;
  selectedSubject: SubjectFilter;
  customPassages: LongPassage[];
  onSelectSubject: (subject: SubjectFilter) => void;
  onRequireStudent: () => void;
  onReportTelemetry: (mode: PracticeMode, subject: SubjectFilter, liveCpm: number, liveAccuracy: number) => void;
  onCompleteSession: (payload: {
    mode: 'LONG';
    subject: SubjectFilter;
    itemTitle: string;
    cpm: number;
    maxCpm: number;
    accuracy: number;
    durationSec: number;
    score: number;
    passageId: string;
    wordsLearned: string[];
  }) => Promise<void>;
  onNavigateWithSubject: (tab: AppTab, subject: SubjectFilter) => void;
}

export const LongPracticeView: React.FC<LongPracticeViewProps> = ({
  currentStudent,
  selectedSubject,
  customPassages,
  onSelectSubject,
  onRequireStudent,
  onReportTelemetry,
  onCompleteSession,
  onNavigateWithSubject,
}) => {
  const allPassages = useMemo(() => [...LONG_PASSAGES, ...customPassages], [customPassages]);

  const filteredPassages = useMemo(() => {
    if (selectedSubject === '전체') return allPassages;
    return allPassages.filter((p) => p.subject === selectedSubject);
  }, [allPassages, selectedSubject]);

  const [selectedPassageId, setSelectedPassageId] = useState<string>(filteredPassages[0]?.id || '');

  useEffect(() => {
    if (!filteredPassages.some((p) => p.id === selectedPassageId)) {
      setSelectedPassageId(filteredPassages[0]?.id || '');
    }
  }, [filteredPassages, selectedPassageId]);

  const activePassage = useMemo(
    () => filteredPassages.find((p) => p.id === selectedPassageId) || filteredPassages[0],
    [filteredPassages, selectedPassageId]
  );

  const [lineIndex, setLineIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [passageStartedAt, setPassageStartedAt] = useState<number | null>(null);
  const [lineStartedAt, setLineStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [completedStrokesSum, setCompletedStrokesSum] = useState(0);
  const [lineAccuracies, setLineAccuracies] = useState<number[]>([]);
  const [peakCpm, setPeakCpm] = useState(0);
  const [completionResult, setCompletionResult] = useState<{
    avgCpm: number;
    maxCpm: number;
    accuracy: number;
    durationSec: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset typing board when switching passage
  useEffect(() => {
    setLineIndex(0);
    setTyped('');
    setPassageStartedAt(null);
    setLineStartedAt(null);
    setCompletedStrokesSum(0);
    setLineAccuracies([]);
    setPeakCpm(0);
    setCompletionResult(null);
  }, [activePassage?.id]);

  const currentTargetLine = activePassage?.sentences[lineIndex] || '';

  const evaluation = useMemo(
    () => evaluateTypingProgress(currentTargetLine, typed, isComposing),
    [currentTargetLine, typed, isComposing]
  );

  const totalLiveStrokes = completedStrokesSum + evaluation.completedCorrectStrokes;
  const elapsedTotalMs = passageStartedAt ? Math.max(1, nowMs - passageStartedAt) : 0;
  const liveCpm = calculateCpm(totalLiveStrokes, elapsedTotalMs);

  useEffect(() => {
    if (!passageStartedAt) return;
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(timer);
  }, [passageStartedAt]);

  useEffect(() => {
    if (liveCpm > peakCpm) setPeakCpm(liveCpm);
  }, [liveCpm, peakCpm]);

  useEffect(() => {
    if (!passageStartedAt || !activePassage) return;
    const ping = setInterval(() => {
      onReportTelemetry('LONG', activePassage.subject, liveCpm, evaluation.accuracy);
    }, 1500);
    return () => clearInterval(ping);
  }, [passageStartedAt, activePassage, liveCpm, evaluation.accuracy, onReportTelemetry]);

  const finishLine = async () => {
    if (!activePassage || !passageStartedAt) return;
    const lineStrokes = countTextStrokes(currentTargetLine);
    const nextStrokesSum = completedStrokesSum + lineStrokes;
    const nextAccList = [...lineAccuracies, evaluation.accuracy];

    const lineCpm = calculateCpm(
      lineStrokes,
      Math.max(800, Date.now() - (lineStartedAt || passageStartedAt))
    );
    const updatedPeak = Math.max(peakCpm, lineCpm, liveCpm);

    if (lineIndex + 1 >= activePassage.sentences.length) {
      const totalDurationSec = Math.max(2, Math.round((Date.now() - passageStartedAt) / 1000));
      const finalCpm = calculateCpm(nextStrokesSum, Math.max(1000, Date.now() - passageStartedAt));
      const avgAcc = Math.round(nextAccList.reduce((a, b) => a + b, 0) / nextAccList.length);

      playFeedbackTone('victory');
      setCompletionResult({
        avgCpm: finalCpm,
        maxCpm: updatedPeak,
        accuracy: avgAcc,
        durationSec: totalDurationSec,
      });

      if (currentStudent) {
        await onCompleteSession({
          mode: 'LONG',
          subject: activePassage.subject,
          itemTitle: activePassage.unitTitle,
          cpm: finalCpm,
          maxCpm: updatedPeak,
          accuracy: avgAcc,
          durationSec: totalDurationSec,
          score: finalCpm,
          passageId: activePassage.id,
          wordsLearned: activePassage.keywords,
        });
      }
      onReportTelemetry('IDLE', activePassage.subject, 0, 100);
    } else {
      playFeedbackTone('hit');
      setCompletedStrokesSum(nextStrokesSum);
      setLineAccuracies(nextAccList);
      setPeakCpm(updatedPeak);
      setLineIndex(lineIndex + 1);
      setTyped('');
      setLineStartedAt(Date.now());
    }
  };

  useEffect(() => {
    if (
      activePassage &&
      !completionResult &&
      evaluation.isComplete &&
      typed === currentTargetLine &&
      currentTargetLine.length > 0
    ) {
      const t = setTimeout(() => {
        void finishLine();
      }, 180);
      return () => clearTimeout(t);
    }
  }, [evaluation.isComplete, typed, currentTargetLine, activePassage, completionResult]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentStudent) {
      onRequireStudent();
      return;
    }
    const val = e.target.value;
    if (!passageStartedAt && val.length > 0 && activePassage) {
      const now = Date.now();
      setPassageStartedAt(now);
      setLineStartedAt(now);
      setNowMs(now);
      onReportTelemetry('LONG', activePassage.subject, 0, 100);
    }
    setTyped(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing && currentTargetLine) {
      if (typed.length >= currentTargetLine.length - 1 && evaluation.accuracy >= 60) {
        e.preventDefault();
        void finishLine();
      }
    }
  };

  const resetPassage = () => {
    setLineIndex(0);
    setTyped('');
    setPassageStartedAt(null);
    setLineStartedAt(null);
    setCompletedStrokesSum(0);
    setLineAccuracies([]);
    setPeakCpm(0);
    setCompletionResult(null);
    inputRef.current?.focus();
  };

  const completedIds = useMemo(() => {
    if (!currentStudent) return new Set<string>();
    const ids = new Set<string>();
    (['국어', '수학', '사회', '과학'] as const).forEach((subj) => {
      currentStudent.subjectProgress[subj]?.completedPassageIds.forEach((id) => ids.add(id));
    });
    return ids;
  }, [currentStudent]);

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            2022 개정 교육과정 장문 연습 보드
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            6학년 국어·수학·사회·과학 핵심 문단을 따라 적으며 교과 개념을 복습하세요. 사용된 핵심 단어는 산성비와 레이싱 대결에도 연계됩니다.
          </p>
        </div>
        <SubjectSelector value={selectedSubject} onChange={onSelectSubject} />
      </div>

      {/* Two-zone Educational Layout: Left Unit Deck + Right Interactive Typing Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Curriculum Unit Selector */}
        <aside className="lg:col-span-4 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              교과 단원 목록 ({filteredPassages.length})
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums">
              완료 {filteredPassages.filter((p) => completedIds.has(p.id)).length}개
            </span>
          </div>
          <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100">
            {filteredPassages.map((passage) => {
              const isSelected = activePassage?.id === passage.id;
              const isDone = completedIds.has(passage.id);
              return (
                <button
                  key={passage.id}
                  type="button"
                  onClick={() => setSelectedPassageId(passage.id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${
                    isSelected ? 'bg-sky-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-sky-700">
                      {passage.subject} · {passage.difficulty}
                      {passage.isCustom ? ' · 교사 추가' : ''}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        isDone ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {isDone ? '학습 완료' : '학습 전'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 leading-snug">
                    {passage.unitTitle}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 truncate">
                    핵심 단어: {passage.keywords.join(', ')}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right: Main Long Sentence Board */}
        {activePassage && (
          <section className="lg:col-span-8 space-y-5">
            {/* Unit Header & Live Metrics */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-slate-500">
                    {activePassage.subject} · {activePassage.achievementStandard}
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {activePassage.unitTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={resetPassage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  다시 쓰기
                </button>
              </div>

              {/* Tabular Live Metrics */}
              <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="px-4 py-3">
                  <div className="text-[11px] text-slate-500">평균 타수</div>
                  <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                    {liveCpm} <span className="text-xs font-normal text-slate-500">타/분</span>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[11px] text-slate-500">현재 정확도</div>
                  <div className="font-mono text-xl font-semibold text-emerald-700 tabular-nums">
                    {evaluation.accuracy}%
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[11px] text-slate-500">문단 진행</div>
                  <div className="font-mono text-xl font-semibold text-sky-700 tabular-nums">
                    {completionResult ? activePassage.sentences.length : lineIndex + 1} /{' '}
                    {activePassage.sentences.length}
                  </div>
                </div>
              </div>

              {/* Paragraph Passage Display */}
              {completionResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 text-center space-y-4">
                  <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      단원 장문 학습을 완료했습니다
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      평균 {completionResult.avgCpm}타/분 · 최고 {completionResult.maxCpm}타/분 · 정확도{' '}
                      {completionResult.accuracy}% · 소요 {completionResult.durationSec}초
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetPassage}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      한 번 더 복습하기
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateWithSubject('ACID_RAIN', activePassage.subject)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700"
                    >
                      <CloudRain className="h-3.5 w-3.5" />
                      이 단어로 산성비 게임하기
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateWithSubject('RACING', activePassage.subject)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      이 단어로 레이싱 대결하기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                    {activePassage.sentences.map((sentence, idx) => {
                      const isCurrent = idx === lineIndex;
                      const isDone = idx < lineIndex;

                      if (isCurrent) {
                        return (
                          <div
                            key={idx}
                            onClick={() => inputRef.current?.focus()}
                            className="rounded-lg bg-white border border-sky-200 px-4 py-3.5 shadow-xs cursor-text"
                          >
                            <div className="text-[11px] font-semibold text-sky-700 mb-1">
                              {idx + 1}번째 문장 입력 중
                            </div>
                            <div className="text-lg sm:text-xl font-medium leading-relaxed break-keep">
                              {sentence.split('').map((ch, cIdx) => {
                                const st = evaluation.charStates[cIdx] || 'pending';
                                let cls = 'text-slate-400';
                                if (st === 'correct') cls = 'text-emerald-700 font-semibold';
                                else if (st === 'composing')
                                  cls = 'text-sky-700 underline decoration-2 underline-offset-4';
                                else if (st === 'incorrect')
                                  cls = 'text-rose-700 bg-rose-100 rounded px-0.5';
                                const isCursor = cIdx === typed.length;
                                return (
                                  <span
                                    key={cIdx}
                                    className={`${cls} ${isCursor ? 'border-b-2 border-sky-600' : ''}`}
                                  >
                                    {ch}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className={`px-4 py-2 text-sm leading-relaxed ${
                            isDone ? 'text-emerald-700 line-through/30 opacity-75' : 'text-slate-500'
                          }`}
                        >
                          <span className="font-mono text-xs mr-2">{idx + 1}.</span>
                          {sentence}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label htmlFor="long-typing-input" className="sr-only">
                      장문 문장 입력창
                    </label>
                    <input
                      id="long-typing-input"
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
                          ? '강조된 문장을 보고 정확히 입력해 보세요'
                          : '학생 접속 후 장문 학습을 시작해 주세요'
                      }
                      className="w-full rounded-xl border-2 border-slate-300 bg-white px-5 py-3.5 text-lg text-slate-900 placeholder:text-slate-400 placeholder:text-sm focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Curriculum Key Vocabulary Linkage Strip */}
              <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                    산성비·레이싱 연계 핵심 단어 ({activePassage.subject})
                  </div>
                  <div className="text-xs text-slate-600">
                    {activePassage.keywords.join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateWithSubject('ACID_RAIN', activePassage.subject)}
                    className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 whitespace-nowrap"
                  >
                    산성비로 단어 복습
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateWithSubject('RACING', activePassage.subject)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
                  >
                    레이싱 대결
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
