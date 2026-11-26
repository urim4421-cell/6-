import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, Play, Plus, Trophy, Users, Volume2, VolumeX } from 'lucide-react';
import { buildSubjectWordPool } from '../data/curriculum';
import type { LongPassage, PracticeMode, RaceRoom, StudentProfile, SubjectFilter } from '../types';
import { calculateCpm, countTextStrokes, evaluateTypingProgress, playFeedbackTone } from '../utils/hangul';
import { SubjectSelector } from './SubjectSelector';

interface RacingGameProps {
  currentStudent: StudentProfile | null;
  selectedSubject: SubjectFilter;
  customPassages: LongPassage[];
  rooms: RaceRoom[];
  activeRoom: RaceRoom | null;
  onSelectSubject: (subject: SubjectFilter) => void;
  onRequireStudent: () => void;
  onCreateRoom: (subject: SubjectFilter, withBots: boolean, roomName: string) => void;
  onJoinRoom: (roomId: string) => void;
  onStartRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onSendRaceProgress: (
    roomId: string,
    progressPct: number,
    cpm: number,
    accuracy: number,
    wordsCleared: number,
    finished: boolean
  ) => void;
  onReportTelemetry: (mode: PracticeMode, subject: SubjectFilter, liveCpm: number, liveAccuracy: number) => void;
  onCompleteSession: (payload: {
    mode: 'RACING';
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

const LANE_COLORS = [
  'text-sky-600',
  'text-emerald-600',
  'text-amber-600',
  'text-indigo-600',
  'text-rose-600',
];

export const RacingGame: React.FC<RacingGameProps> = ({
  currentStudent,
  selectedSubject,
  customPassages,
  rooms,
  activeRoom,
  onSelectSubject,
  onRequireStudent,
  onCreateRoom,
  onJoinRoom,
  onStartRoom,
  onLeaveRoom,
  onSendRaceProgress,
  onReportTelemetry,
  onCompleteSession,
}) => {
  const [roomNameInput, setRoomNameInput] = useState('');
  const [withBots, setWithBots] = useState(true);
  const [promptIndex, setPromptIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [muted, setMuted] = useState(false);

  const raceStartRef = useRef<number>(0);
  const strokesRef = useRef<number>(0);
  const accListRef = useRef<number[]>([]);
  const savedFinishRef = useRef<boolean>(false);
  const prevCountdownRef = useRef<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const wordPreview = useMemo(
    () => buildSubjectWordPool(selectedSubject, customPassages).slice(0, 10),
    [selectedSubject, customPassages]
  );

  // Reset typing state when a race transitions to COUNTDOWN or RACING
  useEffect(() => {
    if (!activeRoom) {
      setPromptIndex(0);
      setTyped('');
      strokesRef.current = 0;
      accListRef.current = [];
      savedFinishRef.current = false;
      return;
    }

    if (activeRoom.status === 'COUNTDOWN' && prevCountdownRef.current !== activeRoom.countdown) {
      prevCountdownRef.current = activeRoom.countdown;
      playFeedbackTone('countdown', muted);
    }

    if (activeRoom.status === 'RACING' && raceStartRef.current === 0) {
      raceStartRef.current = Date.now();
      strokesRef.current = 0;
      accListRef.current = [];
      savedFinishRef.current = false;
      setPromptIndex(0);
      setTyped('');
      playFeedbackTone('hit', muted);
      setTimeout(() => inputRef.current?.focus(), 40);
    }

    if (activeRoom.status === 'WAITING') {
      raceStartRef.current = 0;
    }
  }, [activeRoom?.roomId, activeRoom?.status, activeRoom?.countdown, muted]);

  // Handle race completion persistence
  useEffect(() => {
    if (!activeRoom || !currentStudent || savedFinishRef.current) return;
    const myRacer = activeRoom.racers.find((r) => r.id === currentStudent.id);
    if (myRacer?.finished) {
      savedFinishRef.current = true;
      playFeedbackTone(myRacer.finishRank === 1 ? 'victory' : 'complete', muted);
      onReportTelemetry('IDLE', activeRoom.subject, 0, 100);
      const durSec = Math.max(2, Math.round((Date.now() - raceStartRef.current) / 1000));
      void onCompleteSession({
        mode: 'RACING',
        subject: activeRoom.subject,
        itemTitle: `${activeRoom.roomName} (${myRacer.finishRank || 1}위)`,
        cpm: myRacer.cpm,
        maxCpm: Math.round(myRacer.cpm * 1.15),
        accuracy: myRacer.accuracy,
        durationSec: durSec,
        score: myRacer.finishRank || 1,
        wordsLearned: activeRoom.prompts.filter((p) => !p.includes(' ')).slice(0, 8),
      });
    }
  }, [activeRoom, currentStudent, muted, onCompleteSession, onReportTelemetry]);

  const currentPrompt = activeRoom?.prompts[promptIndex] || '';
  const evaluation = useMemo(
    () => evaluateTypingProgress(currentPrompt, typed, isComposing),
    [currentPrompt, typed, isComposing]
  );

  const completePrompt = () => {
    if (!activeRoom || !currentStudent || activeRoom.status !== 'RACING') return;
    if (!currentPrompt) return;

    strokesRef.current += countTextStrokes(currentPrompt);
    accListRef.current.push(evaluation.accuracy);

    const nextIdx = promptIndex + 1;
    const totalPrompts = activeRoom.prompts.length;
    const progressPct = Math.min(100, Math.round((nextIdx / totalPrompts) * 100));
    const avgAcc = Math.round(
      accListRef.current.reduce((a, b) => a + b, 0) / accListRef.current.length
    );
    const liveCpm = calculateCpm(strokesRef.current, Math.max(900, Date.now() - raceStartRef.current));
    const finished = nextIdx >= totalPrompts;

    playFeedbackTone('hit', muted);
    onSendRaceProgress(activeRoom.roomId, progressPct, liveCpm, avgAcc, nextIdx, finished);
    onReportTelemetry('RACING', activeRoom.subject, liveCpm, avgAcc);

    setPromptIndex(nextIdx);
    setTyped('');
  };

  useEffect(() => {
    if (
      activeRoom?.status === 'RACING' &&
      currentPrompt &&
      evaluation.isComplete &&
      typed === currentPrompt
    ) {
      const t = setTimeout(() => completePrompt(), 110);
      return () => clearTimeout(t);
    }
  }, [activeRoom?.status, currentPrompt, evaluation.isComplete, typed]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) {
      onRequireStudent();
      return;
    }
    const name = roomNameInput.trim() || `${currentStudent.name}의 ${selectedSubject} 레이싱`;
    onCreateRoom(selectedSubject, withBots, name);
    setRoomNameInput('');
  };

  // Lobby View when not inside an active room
  if (!activeRoom) {
    return (
      <main className="mx-auto max-w-[1160px] px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              실시간 교과 레이싱 대결 모드
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              장문 학습에서 나온 교과 핵심 단어와 문장을 빠르게 입력해 결승선을 먼저 통과하세요.
            </p>
          </div>
          <SubjectSelector value={selectedSubject} onChange={onSelectSubject} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Create Race Room */}
          <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">새 대결방 만들기</h2>
              <p className="mt-1 text-xs text-slate-500">
                친구들과 실시간으로 겨루거나 페이스메이커와 함께 연습 레이스를 시작할 수 있습니다.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="race-room-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  대결방 이름
                </label>
                <input
                  id="race-room-name"
                  type="text"
                  maxLength={30}
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  placeholder={`${selectedSubject} 스피드 레이싱`}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">대결 방식</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithBots(true)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-semibold text-left transition-colors ${
                      withBots
                        ? 'border-sky-600 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    페이스메이커 포함
                    <span className="block mt-0.5 text-[11px] font-normal text-slate-500">
                      혼자서도 바로 대결 가능
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithBots(false)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-semibold text-left transition-colors ${
                      !withBots
                        ? 'border-sky-600 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    학급 친구 전용방
                    <span className="block mt-0.5 text-[11px] font-normal text-slate-500">
                      같은 반 친구와 실시간 대결
                    </span>
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                <div className="font-semibold text-slate-800 mb-1">
                  출제 예정 교과 단어 ({selectedSubject})
                </div>
                {wordPreview.map((w) => w.word).join(' · ')}
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                대결방 만들기
              </button>
            </form>
          </section>

          {/* Open Classroom Rooms */}
          <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-600" />
                <h2 className="text-base font-bold text-slate-900">
                  참여 가능한 교실 레이싱방 ({rooms.length})
                </h2>
              </div>
              <span className="text-xs text-slate-500">실시간 WebSocket 동기화</span>
            </div>

            {rooms.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Flag className="mx-auto h-8 w-8 text-slate-300" />
                <div className="text-sm font-semibold text-slate-700">
                  현재 열린 대결방이 없습니다
                </div>
                <p className="text-xs text-slate-500">
                  왼쪽에서 새 대결방을 만들어 친구들을 초대하거나 페이스메이커 대결을 시작해 보세요.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="py-3.5 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-sky-700">{room.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span>방장: {room.hostName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{room.racers.length}명 참가</span>
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{room.roomName}</div>
                    </div>
                    <button
                      type="button"
                      disabled={room.status !== 'WAITING'}
                      onClick={() => {
                        if (!currentStudent) {
                          onRequireStudent();
                          return;
                        }
                        onJoinRoom(room.roomId);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap"
                    >
                      {room.status === 'WAITING' ? '참가하기' : '경기 진행 중'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  const myRacer = currentStudent
    ? activeRoom.racers.find((r) => r.id === currentStudent.id)
    : undefined;
  const isHost = currentStudent?.id === activeRoom.hostId;
  const sortedResults = [...activeRoom.racers].sort((a, b) => {
    if (a.finishRank && b.finishRank) return a.finishRank - b.finishRank;
    if (a.finishRank) return -1;
    if (b.finishRank) return 1;
    return b.progressPct - a.progressPct;
  });

  return (
    <main className="mx-auto max-w-[1160px] px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">
            방 코드 {activeRoom.roomId} · 과목: {activeRoom.subject} · 총 {activeRoom.prompts.length}문제
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{activeRoom.roomName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? '효과음 켜기' : '효과음 끄기'}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onLeaveRoom(activeRoom.roomId)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            대기실로 나가기
          </button>
        </div>
      </div>

      {/* Live Race Track */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>출발선</span>
          <span className="font-semibold text-slate-700">
            {activeRoom.status === 'WAITING'
              ? '출발 대기 중'
              : activeRoom.status === 'COUNTDOWN'
              ? `곧 출발합니다 (${activeRoom.countdown})`
              : activeRoom.status === 'RACING'
              ? '레이싱 진행 중'
              : '경기 종료'}
          </span>
          <span>결승선 (100%)</span>
        </div>

        <div className="space-y-3">
          {activeRoom.racers.map((racer, idx) => {
            const isMe = currentStudent?.id === racer.id;
            const colorCls = LANE_COLORS[racer.colorIndex % LANE_COLORS.length];
            return (
              <div
                key={racer.id}
                className={`rounded-lg border p-3 ${
                  isMe ? 'border-sky-300 bg-sky-50/40' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-900">
                    {racer.name} {isMe ? '(나)' : ''}
                  </span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    {racer.finishRank ? `${racer.finishRank}위 완주 · ` : ''}
                    {racer.cpm}타/분 · {Math.round(racer.progressPct)}%
                  </span>
                </div>
                <div className="relative h-8 rounded-md bg-slate-200/70 overflow-hidden flex items-center px-2">
                  <div
                    style={{
                      width: `${Math.max(4, racer.progressPct)}%`,
                    }}
                    className="h-2 rounded-full bg-sky-500/25 transition-all duration-300"
                  />
                  <div
                    style={{
                      left: `calc(${Math.min(92, racer.progressPct)}% )`,
                    }}
                    className={`absolute transition-all duration-300 ${colorCls}`}
                    aria-hidden="true"
                  >
                    {/* Crisp SVG race car */}
                    <svg width="34" height="18" viewBox="0 0 34 18" fill="none">
                      <rect x="2" y="6" width="28" height="8" rx="3" fill="currentColor" />
                      <path d="M8 6L12 2H22L25 6H8Z" fill="currentColor" opacity="0.85" />
                      <circle cx="9" cy="14" r="3" fill="#0F172A" />
                      <circle cx="24" cy="14" r="3" fill="#0F172A" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Race Controls / Typing Prompt Area */}
      {activeRoom.status === 'WAITING' && (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-900">참가자 대기 중</h2>
          <p className="text-xs text-slate-600">
            다른 학급 친구들이 방 코드 <strong>{activeRoom.roomId}</strong>로 들어오거나, 바로 출발 버튼을 누를 수 있습니다.
          </p>
          {isHost ? (
            <button
              type="button"
              onClick={() => onStartRoom(activeRoom.roomId)}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700"
            >
              <Play className="h-4 w-4" />
              레이싱 출발하기
            </button>
          ) : (
            <div className="text-xs font-medium text-sky-700">
              방장({activeRoom.hostName})이 경기를 시작할 때까지 기다려 주세요.
            </div>
          )}
        </section>
      )}

      {activeRoom.status === 'COUNTDOWN' && (
        <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-10 text-center">
          <div className="font-mono text-5xl font-bold text-sky-700 tabular-nums">
            {activeRoom.countdown}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-700">
            키보드에 손을 올려 주세요!
          </div>
        </section>
      )}

      {activeRoom.status === 'RACING' && !myRacer?.finished && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              진행: {promptIndex + 1} / {activeRoom.prompts.length}
            </span>
            <span className="tabular-nums">정확도 {evaluation.accuracy}%</span>
          </div>

          <div
            onClick={() => inputRef.current?.focus()}
            className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-6 cursor-text"
          >
            <div className="text-2xl font-bold tracking-wide break-keep">
              {currentPrompt.split('').map((ch, idx) => {
                const st = evaluation.charStates[idx] || 'pending';
                let cls = 'text-slate-400';
                if (st === 'correct') cls = 'text-emerald-700';
                else if (st === 'composing')
                  cls = 'text-sky-700 underline decoration-2 underline-offset-4';
                else if (st === 'incorrect') cls = 'text-rose-700 bg-rose-100 rounded px-0.5';
                return (
                  <span key={idx} className={cls}>
                    {ch}
                  </span>
                );
              })}
            </div>
          </div>

          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isComposing && typed.trim() === currentPrompt) {
                e.preventDefault();
                completePrompt();
              }
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionUpdate={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              setTyped(e.currentTarget.value);
            }}
            placeholder="위 단어/문장을 빠르게 입력하세요"
            className="w-full rounded-xl border-2 border-slate-300 px-5 py-3.5 text-lg text-slate-900 focus:border-sky-600 focus:outline-none"
          />
        </section>
      )}

      {(activeRoom.status === 'FINISHED' || myRacer?.finished) && (
        <section className="rounded-xl border border-emerald-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">레이싱 최종 순위</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {sortedResults.map((r, i) => (
              <div key={r.id} className="py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 w-8 tabular-nums">
                    {r.finishRank || i + 1}위
                  </span>
                  <span className="font-semibold text-slate-900">{r.name}</span>
                </div>
                <div className="font-mono text-xs text-slate-600 tabular-nums">
                  평균 {r.cpm}타/분 · 정확도 {r.accuracy}%
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onLeaveRoom(activeRoom.roomId)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700"
            >
              대기실로 돌아가기
            </button>
          </div>
        </section>
      )}
    </main>
  );
};
