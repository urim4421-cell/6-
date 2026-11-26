import React, { useState } from 'react';
import { BookOpen, CloudRain, Flag, Keyboard, ArrowRight } from 'lucide-react';
import type { AppTab, StudentProfile, SubjectFilter } from '../types';
import { SUBJECT_META, SUBJECTS } from '../data/curriculum';

interface StudentHomeViewProps {
  students: StudentProfile[];
  currentStudent: StudentProfile | null;
  selectedSubject: SubjectFilter;
  onSelectSubject: (subject: SubjectFilter) => void;
  onSelectStudent: (student: StudentProfile) => void;
  onCreateStudent: (classNum: number, studentNum: number, name: string) => Promise<void>;
  onNavigate: (tab: AppTab) => void;
}

const HERO_IMG_PATH = '/src/assets/images/classroom_typing_hero_1795675125770.jpg';

export const StudentHomeView: React.FC<StudentHomeViewProps> = ({
  students,
  currentStudent,
  selectedSubject,
  onSelectSubject,
  onSelectStudent,
  onCreateStudent,
  onNavigate,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickClass, setQuickClass] = useState(1);
  const [quickNum, setQuickNum] = useState(students.length + 1);
  const [creating, setCreating] = useState(false);

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    setCreating(true);
    try {
      await onCreateStudent(quickClass, quickNum, quickName.trim());
      setQuickName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-8 space-y-10">
      {/* 2-Column Hero Split with items-stretch */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-7">
          <div>
            <div className="text-xs font-medium text-slate-500">
              2022 개정 교육과정 연계 · 초등학교 6학년 국어·수학·사회·과학
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight text-balance">
              교과서 핵심 개념을 타자로 익히는 6학년 맞춤 배움터
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              단문 연습으로 정확한 손가락 자리를 다지고, 2022 개정 교육과정 장문 보드로 국어·수학·사회·과학 내용을 복습해 보세요. 학습한 교과 단어는 산성비 게임과 실시간 레이싱 대결에 바로 이어집니다.
            </p>
          </div>

          <div className="mt-7 pt-6 border-t border-slate-100">
            {currentStudent ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-slate-900">
                    현재 접속: 6학년 {currentStudent.classNum}반 {currentStudent.studentNum}번{' '}
                    {currentStudent.name}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    평균 {currentStudent.avgCpm}타 · 정확도 {currentStudent.avgAccuracy}% · 완료{' '}
                    {currentStudent.totalSessions}회
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('LONG')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    2022 장문 학습 시작
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('RACING')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    레이싱 대결 입장
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleQuickJoin} className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">
                  학생 이름 입력 또는 아래 명단에서 선택하여 시작하세요
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={quickClass}
                    onChange={(e) => setQuickClass(Number(e.target.value) || 1)}
                    aria-label="반"
                    className="w-16 rounded-lg border border-slate-300 px-2.5 py-2 text-sm tabular-nums focus:border-sky-600 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">반</span>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={quickNum}
                    onChange={(e) => setQuickNum(Number(e.target.value) || 1)}
                    aria-label="번호"
                    className="w-16 rounded-lg border border-slate-300 px-2.5 py-2 text-sm tabular-nums focus:border-sky-600 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">번</span>
                  <input
                    type="text"
                    placeholder="학생 이름 입력"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={creating || !quickName.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    접속 시작
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {students.slice(0, 6).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelectStudent(s)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                      {s.studentNum}번 {s.name}
                    </button>
                  ))}
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 min-h-[280px]">
          {!imgFailed ? (
            <img
              src={HERO_IMG_PATH}
              alt="초등학교 6학년 교실 책상 위 키보드와 국어, 수학 교과 공책 일러스트"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover lg:h-full"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 p-8 text-center">
              <Keyboard className="h-12 w-12 text-sky-600 mb-3" />
              <div className="text-base font-bold text-slate-800">한빛타자 6학년 학습 공간</div>
              <p className="mt-1 text-xs text-slate-500">
                국어 · 수학 · 사회 · 과학 2022 개정 교육과정 연계
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 4-Column Learning Mode Strip */}
      <section aria-labelledby="modes-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
          <h2 id="modes-heading" className="text-lg font-bold text-slate-900">
            학습 및 게임 모드 선택
          </h2>
          <span className="text-xs text-slate-500">
            원하는 활동으로 바로 이동해 타자 실력을 키워 보세요
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('SHORT')}
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-sky-400 transition-colors"
          >
            <div>
              <Keyboard className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-sky-700">
                단문 연습
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                1단계 기초부터 3단계 숙달까지 수준별 짧은 문장으로 타속과 정확도를 다집니다.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-sky-700">연습하러 가기 →</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('LONG')}
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-emerald-400 transition-colors"
          >
            <div>
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-emerald-700">
                2022 장문 연습 보드
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                국어·수학·사회·과학 교과 핵심 문단을 직접 치며 개념을 복습하고 단어를 익힙니다.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-emerald-700">장문 보드 열기 →</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ACID_RAIN')}
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-amber-400 transition-colors"
          >
            <div>
              <CloudRain className="h-5 w-5 text-amber-600" />
              <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-amber-700">
                산성비 게임
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                장문 학습에 나온 교과 핵심 단어들이 하늘에서 내려옵니다. 빠르게 입력해 방어하세요.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-amber-700">게임 시작하기 →</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('RACING')}
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-indigo-400 transition-colors"
          >
            <div>
              <Flag className="h-5 w-5 text-indigo-600" />
              <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-indigo-700">
                레이싱 대결 모드
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                친구 또는 페이스메이커와 실시간 대결을 펼치며 교과 어휘와 문장을 돌파합니다.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-indigo-700">대결방 입장 →</div>
          </button>
        </div>
      </section>

      {/* Subject Focus Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              2022 개정 교육과정 6학년 과목 선택
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              과목을 선택하면 단문·장문 연습과 산성비·레이싱 단어장이 해당 과목 중심으로 구성됩니다.
            </p>
          </div>
          <div className="text-xs font-medium text-slate-600">
            현재 선택 과목: <span className="font-bold text-sky-700">{selectedSubject}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SUBJECTS.map((subj) => {
            const meta = SUBJECT_META[subj];
            const isSelected = selectedSubject === subj;
            return (
              <button
                key={subj}
                type="button"
                onClick={() => onSelectSubject(isSelected ? '전체' : subj)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50/70'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{meta.label}</span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {isSelected ? '선택됨' : '선택하기'}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
};
