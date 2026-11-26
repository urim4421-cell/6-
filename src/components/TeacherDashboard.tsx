import React, { useMemo, useState } from 'react';
import { Download, Plus, Search, Trash2, UserCheck, Users } from 'lucide-react';
import { LONG_PASSAGES, SUBJECTS } from '../data/curriculum';
import type { LongPassage, PracticeSession, StudentProfile, Subject } from '../types';

interface TeacherDashboardProps {
  students: StudentProfile[];
  sessions: PracticeSession[];
  customPassages: LongPassage[];
  wsConnected: boolean;
  onAddCurriculumPassage: (payload: {
    subject: Subject;
    unitTitle: string;
    achievementStandard: string;
    difficulty: '기초' | '표준' | '심화';
    sentences: string[];
    keywords: string[];
  }) => Promise<void>;
  onBulkAddStudents: (
    classNum: number,
    startNum: number,
    entries: Array<{ studentNum?: number; name: string }>
  ) => Promise<number>;
  onDeleteStudent: (studentId: string) => Promise<void>;
}

type SortKey = 'num' | 'avgCpm' | 'accuracy' | 'long';
type DashboardTab = 'ANALYTICS' | 'ROSTER';

const MODE_LABEL: Record<string, string> = {
  IDLE: '대기 중',
  SHORT: '단문 연습',
  LONG: '장문 학습',
  ACID_RAIN: '산성비 게임',
  RACING: '레이싱 대결',
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  students,
  sessions,
  customPassages,
  wsConnected,
  onAddCurriculumPassage,
  onBulkAddStudents,
  onDeleteStudent,
}) => {
  const [dashTab, setDashTab] = useState<DashboardTab>('ANALYTICS');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('avgCpm');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');

  // Roster management state
  const [singleClassNum, setSingleClassNum] = useState(1);
  const [singleStudentNum, setSingleStudentNum] = useState(students.length + 1);
  const [singleName, setSingleName] = useState('');
  const [bulkClassNum, setBulkClassNum] = useState(1);
  const [bulkStartNum, setBulkStartNum] = useState(1);
  const [bulkText, setBulkText] = useState('');
  const [rosterClassFilter, setRosterClassFilter] = useState<number | 'ALL'>('ALL');
  const [rosterSaving, setRosterSaving] = useState(false);
  const [rosterFeedback, setRosterFeedback] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Teacher curriculum form state
  const [newSubject, setNewSubject] = useState<Subject>('국어');
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newStandard, setNewStandard] = useState('');
  const [newSentencesText, setNewSentencesText] = useState('');
  const [newKeywordsText, setNewKeywordsText] = useState('');
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [curriculumFeedback, setCurriculumFeedback] = useState('');

  const allPassages = useMemo(() => [...LONG_PASSAGES, ...customPassages], [customPassages]);

  // Class-wide KPI calculations
  const classSummary = useMemo(() => {
    const activeLearners = students.filter((s) => s.totalSessions > 0);
    const classAvgCpm =
      activeLearners.length === 0
        ? 0
        : Math.round(
            activeLearners.reduce((sum, s) => sum + s.avgCpm, 0) / activeLearners.length
          );
    const classAvgAcc =
      activeLearners.length === 0
        ? 100
        : Math.round(
            activeLearners.reduce((sum, s) => sum + s.avgAccuracy, 0) / activeLearners.length
          );
    const totalCompleted = students.reduce((sum, s) => sum + s.totalSessions, 0);
    const now = Date.now();
    const liveStudents = students.filter(
      (s) => s.currentActivity.mode !== 'IDLE' && now - s.currentActivity.updatedAt < 120000
    );

    return {
      classAvgCpm,
      classAvgAcc,
      totalCompleted,
      liveStudents,
    };
  }, [students]);

  // Subject breakdown across class
  const subjectOverview = useMemo(() => {
    return SUBJECTS.map((subj) => {
      const totalUnits = allPassages.filter((p) => p.subject === subj).length;
      const withSessions = students.filter((s) => s.subjectProgress[subj]?.sessions > 0);
      const avgCpm =
        withSessions.length === 0
          ? 0
          : Math.round(
              withSessions.reduce((sum, s) => sum + s.subjectProgress[subj].avgCpm, 0) /
                withSessions.length
            );
      const avgAcc =
        withSessions.length === 0
          ? 100
          : Math.round(
              withSessions.reduce((sum, s) => sum + s.subjectProgress[subj].avgAccuracy, 0) /
                withSessions.length
            );
      const avgCompletedUnits =
        students.length === 0
          ? 0
          : Number(
              (
                students.reduce(
                  (sum, s) => sum + (s.subjectProgress[subj]?.completedPassageIds.length || 0),
                  0
                ) / students.length
              ).toFixed(1)
            );
      return { subj, totalUnits, avgCpm, avgAcc, avgCompletedUnits };
    });
  }, [allPassages, students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = students.filter((s) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        `${s.classNum}반 ${s.studentNum}번`.includes(q)
      );
    });
    return [...list].sort((a, b) => {
      if (sortKey === 'avgCpm') return b.avgCpm - a.avgCpm;
      if (sortKey === 'accuracy') return b.avgAccuracy - a.avgAccuracy;
      if (sortKey === 'long') return b.longCompleted - a.longCompleted;
      return a.studentNum - b.studentNum;
    });
  }, [students, searchQuery, sortKey]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || filteredStudents[0] || null,
    [students, selectedStudentId, filteredStudents]
  );

  const selectedStudentSessions = useMemo(() => {
    if (!selectedStudent) return [];
    return sessions.filter((ses) => ses.studentId === selectedStudent.id).slice(0, 12);
  }, [sessions, selectedStudent]);

  const handleDownloadCsv = () => {
    const headers = [
      '반',
      '번호',
      '이름',
      '평균타수(타/분)',
      '최고타수(타/분)',
      '평균정확도(%)',
      '단문완료',
      '장문완료',
      '게임참여',
      '산성비최고점',
      '레이싱우승',
      '국어평균타수',
      '수학평균타수',
      '사회평균타수',
      '과학평균타수',
    ];
    const rows = filteredStudents.map((s) => [
      s.classNum,
      s.studentNum,
      s.name,
      s.avgCpm,
      s.bestCpm,
      s.avgAccuracy,
      s.shortCompleted,
      s.longCompleted,
      s.gamesPlayed,
      s.bestAcidScore,
      s.raceWins,
      s.subjectProgress.국어.avgCpm,
      s.subjectProgress.수학.avgCpm,
      s.subjectProgress.사회.avgCpm,
      s.subjectProgress.과학.avgCpm,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `6학년_타자성취도_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    const sentences = newSentencesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const keywords = newKeywordsText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (!newUnitTitle.trim() || sentences.length === 0) {
      setCurriculumFeedback('단원명과 학습 문장(한 줄에 한 문장)을 입력해 주세요.');
      return;
    }

    setSavingCurriculum(true);
    setCurriculumFeedback('');
    try {
      await onAddCurriculumPassage({
        subject: newSubject,
        unitTitle: newUnitTitle.trim(),
        achievementStandard:
          newStandard.trim() || `2022 개정 [${newSubject}] 교사 맞춤형 복습 문장`,
        difficulty: '표준',
        sentences,
        keywords,
      });
      setNewUnitTitle('');
      setNewStandard('');
      setNewSentencesText('');
      setNewKeywordsText('');
      setCurriculumFeedback('새 장문 단원과 게임 연계 단어가 실시간으로 추가되었습니다.');
    } catch {
      setCurriculumFeedback('추가 중 오류가 발생했습니다.');
    } finally {
      setSavingCurriculum(false);
    }
  };

  const parsedBulkEntries = useMemo(() => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const results: Array<{ studentNum?: number; name: string }> = [];
    for (const line of lines) {
      // Handle "1\t홍길동" or "1, 홍길동" or "1. 홍길동" or "1번 홍길동" or "1 홍길동"
      const tabOrNumMatch = line.match(/^(\d+)\s*[.)번,\t]\s*([^\d,\t].*)$/);
      if (tabOrNumMatch) {
        results.push({
          studentNum: Number(tabOrNumMatch[1]),
          name: tabOrNumMatch[2].trim(),
        });
        continue;
      }

      const spaceNumMatch = line.match(/^(\d+)\s+([^\d].*)$/);
      if (spaceNumMatch) {
        results.push({
          studentNum: Number(spaceNumMatch[1]),
          name: spaceNumMatch[2].trim(),
        });
        continue;
      }

      // Otherwise split comma-separated names on a single line (e.g. "김철수, 이영희")
      const commaNames = line
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0 && !/^\d+$/.test(n));
      for (const name of commaNames) {
        results.push({ name });
      }
    }
    return results;
  }, [bulkText]);

  const rosterClasses = useMemo(() => {
    const set = new Set<number>(students.map((s) => s.classNum));
    return Array.from(set).sort((a, b) => a - b);
  }, [students]);

  const sortedRosterStudents = useMemo(() => {
    return [...students]
      .filter((s) => rosterClassFilter === 'ALL' || s.classNum === rosterClassFilter)
      .sort((a, b) => (a.classNum !== b.classNum ? a.classNum - b.classNum : a.studentNum - b.studentNum));
  }, [students, rosterClassFilter]);

  const handleSingleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) {
      setRosterFeedback('학생 이름을 입력해 주세요.');
      return;
    }
    setRosterSaving(true);
    setRosterFeedback('');
    try {
      const added = await onBulkAddStudents(singleClassNum, singleStudentNum, [
        { studentNum: singleStudentNum, name: singleName.trim() },
      ]);
      setSingleName('');
      setSingleStudentNum((n) => n + 1);
      setRosterFeedback(
        added > 0
          ? `${singleClassNum}반 ${singleStudentNum}번 학생이 명단에 추가되었습니다.`
          : '이미 동일한 반·번호·이름의 학생이 등록되어 있습니다.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setRosterFeedback(msg ? `학생 등록 오류: ${msg}` : '학생 등록 중 오류가 발생했습니다.');
    } finally {
      setRosterSaving(false);
    }
  };

  const handleBulkRosterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBulkEntries.length === 0) {
      setRosterFeedback('일괄 등록할 학생 이름을 입력해 주세요.');
      return;
    }
    setRosterSaving(true);
    setRosterFeedback('');
    try {
      const added = await onBulkAddStudents(bulkClassNum, bulkStartNum, parsedBulkEntries);
      setBulkText('');
      setRosterFeedback(
        added > 0
          ? `${bulkClassNum}반 학생 ${added}명이 명단에 일괄 등록되었습니다.`
          : '새로 추가된 학생이 없습니다 (중복 명단 제외).'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setRosterFeedback(msg ? `일괄 등록 오류: ${msg}` : '일괄 등록 중 오류가 발생했습니다.');
    } finally {
      setRosterSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs text-slate-500">
            교사용 실시간 학습 관리 · {wsConnected ? '실시간 연결됨' : '재연결 중'}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            6학년 학급 타자 진도 및 성취도 대시보드
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="교사 대시보드 메뉴"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
          >
            <button
              type="button"
              role="tab"
              aria-selected={dashTab === 'ANALYTICS'}
              onClick={() => setDashTab('ANALYTICS')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                dashTab === 'ANALYTICS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              성취도 및 진도
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dashTab === 'ROSTER'}
              onClick={() => setDashTab('ROSTER')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                dashTab === 'ROSTER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              학생 명단 관리 ({students.length}명)
            </button>
          </div>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            성적표 CSV 내려받기
          </button>
        </div>
      </div>

      {dashTab === 'ROSTER' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Single + Bulk Roster Input Forms */}
          <div className="lg:col-span-5 space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">개별 학생 추가</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  반, 번호, 이름을 입력해 학생 한 명을 빠르게 등록합니다.
                </p>
              </div>
              <form onSubmit={handleSingleStudentSubmit} className="space-y-3">
                <div className="grid grid-cols-4 gap-2.5">
                  <div>
                    <label htmlFor="roster-single-class" className="block text-xs text-slate-600 mb-1">
                      반
                    </label>
                    <input
                      id="roster-single-class"
                      type="number"
                      min={1}
                      max={20}
                      value={singleClassNum}
                      onChange={(e) => setSingleClassNum(Number(e.target.value) || 1)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs tabular-nums focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="roster-single-num" className="block text-xs text-slate-600 mb-1">
                      번호
                    </label>
                    <input
                      id="roster-single-num"
                      type="number"
                      min={1}
                      max={50}
                      value={singleStudentNum}
                      onChange={(e) => setSingleStudentNum(Number(e.target.value) || 1)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs tabular-nums focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="roster-single-name" className="block text-xs text-slate-600 mb-1">
                      이름
                    </label>
                    <input
                      id="roster-single-name"
                      type="text"
                      maxLength={20}
                      placeholder="예: 홍길동"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={rosterSaving}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  학생 1명 등록하기
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">학급 명단 일괄 입력</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  한 줄에 한 명씩 입력하거나 &quot;번호 이름&quot; 형식으로 붙여넣어 한 번에 등록하세요.
                </p>
              </div>
              <form onSubmit={handleBulkRosterSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="roster-bulk-class" className="block text-xs text-slate-600 mb-1">
                      대상 반
                    </label>
                    <input
                      id="roster-bulk-class"
                      type="number"
                      min={1}
                      max={20}
                      value={bulkClassNum}
                      onChange={(e) => setBulkClassNum(Number(e.target.value) || 1)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs tabular-nums focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="roster-bulk-start" className="block text-xs text-slate-600 mb-1">
                      자동 번호 시작
                    </label>
                    <input
                      id="roster-bulk-start"
                      type="number"
                      min={1}
                      max={50}
                      value={bulkStartNum}
                      onChange={(e) => setBulkStartNum(Number(e.target.value) || 1)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs tabular-nums focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="roster-bulk-textarea" className="block text-xs text-slate-600 mb-1">
                    학생 명단 (줄바꿈 또는 쉼표 구분)
                  </label>
                  <textarea
                    id="roster-bulk-textarea"
                    rows={6}
                    placeholder={'김민수\n이수빈\n박지훈\n또는\n1 김민수\n2 이수빈'}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="tabular-nums">인식된 학생: {parsedBulkEntries.length}명</span>
                  <button
                    type="submit"
                    disabled={rosterSaving || parsedBulkEntries.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50"
                  >
                    <Users className="h-3.5 w-3.5" />
                    명단 일괄 등록
                  </button>
                </div>
              </form>
              {rosterFeedback && (
                <p className="text-xs font-medium text-sky-700 border-t border-slate-100 pt-3">
                  {rosterFeedback}
                </p>
              )}
            </section>
          </div>

          {/* Right: Registered Student Roster Table */}
          <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  등록된 학생 명단 ({sortedRosterStudents.length}명)
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  여기에 등록된 학생은 학생 접속 화면에서 바로 이름을 선택해 연습할 수 있습니다.
                </p>
              </div>
              <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRosterClassFilter('ALL')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md whitespace-nowrap ${
                    rosterClassFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  전체 반
                </button>
                {rosterClasses.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setRosterClassFilter(cls)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md whitespace-nowrap ${
                      rosterClassFilter === cls
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cls}반
                  </button>
                ))}
              </div>
            </div>

            {sortedRosterStudents.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                등록된 학생이 없습니다. 왼쪽에서 학생 명단을 입력해 주세요.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr className="text-[11px] font-semibold text-slate-600">
                      <th className="py-2.5 px-4">학반</th>
                      <th className="py-2.5 px-3">번호</th>
                      <th className="py-2.5 px-3">이름</th>
                      <th className="py-2.5 px-3 text-right">평균 타수</th>
                      <th className="py-2.5 px-3 text-right">학습 횟수</th>
                      <th className="py-2.5 px-4 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {sortedRosterStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600">
                          6-{stu.classNum}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                          {stu.studentNum}번
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{stu.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sky-700">
                          {stu.avgCpm}타/분
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                          {stu.totalSessions}회
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {confirmDeleteId === stu.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteStudent(stu.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 rounded hover:bg-rose-700"
                              >
                                삭제 확인
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(stu.id)}
                              aria-label={`${stu.name} 삭제`}
                              className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 p-1 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="text-[11px]">삭제</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <>

      {/* 4-Column KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <div className="p-5">
          <div className="text-xs text-slate-500">학급 평균 타수</div>
          <div className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {classSummary.classAvgCpm} <span className="text-xs font-normal text-slate-500">타/분</span>
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">학급 평균 정확도</div>
          <div className="mt-1 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
            {classSummary.classAvgAcc}%
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">실시간 활동 중</div>
          <div className="mt-1 font-mono text-3xl font-bold text-sky-700 tabular-nums">
            {classSummary.liveStudents.length}{' '}
            <span className="text-xs font-normal text-slate-500">/ {students.length}명</span>
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">누적 완료 학습</div>
          <div className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {classSummary.totalCompleted} <span className="text-xs font-normal text-slate-500">회</span>
          </div>
        </div>
      </section>

      {/* Live Classroom Activity Monitor */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">실시간 학생 활동 모니터</h2>
          </div>
          <span className="text-xs text-slate-500">
            학생이 연습이나 게임을 시작하면 타수가 즉시 반영됩니다
          </span>
        </div>

        {classSummary.liveStudents.length === 0 ? (
          <p className="py-4 text-xs text-slate-500">
            현재 실시간으로 타자를 입력 중인 학생이 없습니다. 다른 창에서 학생으로 연습을 시작하면 여기에 실시간으로 표시됩니다.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {classSummary.liveStudents.map((stu) => (
              <div
                key={stu.id}
                className="rounded-lg border border-sky-200 bg-sky-50/50 px-3.5 py-2.5 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {stu.classNum}반 {stu.studentNum}번 {stu.name}
                  </div>
                  <div className="text-[11px] text-sky-800">
                    {MODE_LABEL[stu.currentActivity.mode]} · {stu.currentActivity.subject}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-sm font-bold text-slate-900">
                    {stu.currentActivity.liveCpm}타
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {stu.currentActivity.liveAccuracy}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Main Grid: Student Table + Student Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-8 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              학생별 평균 타수 및 학습 진도 ({filteredStudents.length}명)
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="학생 이름 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                {(
                  [
                    { id: 'avgCpm', label: '평균타수순' },
                    { id: 'accuracy', label: '정확도순' },
                    { id: 'long', label: '장문진도순' },
                    { id: 'num', label: '번호순' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortKey(s.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md whitespace-nowrap ${
                      sortKey === s.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-4">번호 · 이름</th>
                  <th className="py-2.5 px-3 text-right">평균 타수</th>
                  <th className="py-2.5 px-3 text-right">최고 타수</th>
                  <th className="py-2.5 px-3 text-right">정확도</th>
                  <th className="py-2.5 px-3 text-right">단문 / 장문</th>
                  <th className="py-2.5 px-4">2022 교과 진도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((stu) => {
                  const isSelected = selectedStudent?.id === stu.id;
                  const totalLongAvailable = allPassages.length;
                  const completedLongCount = SUBJECTS.reduce(
                    (sum, subj) =>
                      sum + (stu.subjectProgress[subj]?.completedPassageIds.length || 0),
                    0
                  );
                  const pct =
                    totalLongAvailable === 0
                      ? 0
                      : Math.min(100, Math.round((completedLongCount / totalLongAvailable) * 100));

                  return (
                    <tr
                      key={stu.id}
                      onClick={() => setSelectedStudentId(stu.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {stu.classNum}반 {stu.studentNum}번 {stu.name}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sky-700 tabular-nums whitespace-nowrap">
                        {stu.avgCpm} 타/분
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {stu.bestCpm} 타
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 tabular-nums whitespace-nowrap">
                        {stu.avgAccuracy}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {stu.shortCompleted} / {stu.longCompleted}
                      </td>
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-sky-600 rounded-full"
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-600 tabular-nums w-9 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Selected Student Detail Panel */}
        <aside className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          {selectedStudent ? (
            <>
              <div className="border-b border-slate-100 pb-3">
                <div className="text-xs text-slate-500">
                  6학년 {selectedStudent.classNum}반 {selectedStudent.studentNum}번 학생 상세 분석
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {selectedStudent.name}
                </h3>
                <div className="mt-1 text-xs text-slate-600 tabular-nums">
                  평균 {selectedStudent.avgCpm}타/분 · 산성비 최고 {selectedStudent.bestAcidScore}점 · 레이싱 우승 {selectedStudent.raceWins}회
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-800 mb-2.5">
                  과목별 평균 타자 및 성취도
                </div>
                <div className="space-y-2.5">
                  {SUBJECTS.map((subj) => {
                    const st = selectedStudent.subjectProgress[subj];
                    const totalSubjUnits = allPassages.filter((p) => p.subject === subj).length;
                    return (
                      <div
                        key={subj}
                        className="flex items-center justify-between text-xs border-b border-slate-100 pb-2"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{subj}</span>
                          <span className="ml-2 text-slate-500 tabular-nums">
                            단원 {st.completedPassageIds.length}/{totalSubjUnits}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums text-slate-700">
                          {st.avgCpm}타 · {st.avgAccuracy}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-800 mb-2">최근 학습 기록</div>
                {selectedStudentSessions.length === 0 ? (
                  <p className="text-xs text-slate-500">아직 완료된 학습 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedStudentSessions.map((ses) => (
                      <div
                        key={ses.id}
                        className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>
                            {MODE_LABEL[ses.mode]} · {ses.subject}
                          </span>
                          <span className="font-mono tabular-nums text-sky-700">
                            {ses.cpm}타 ({ses.accuracy}%)
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                          {ses.itemTitle}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">학생을 선택해 주세요.</div>
          )}
        </aside>
      </div>

      {/* Bottom Row: Subject Averages + Teacher Custom Curriculum Adder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            2022 개정 교육과정 과목별 학급 성취도
          </h2>
          <div className="divide-y divide-slate-100">
            {subjectOverview.map((row) => (
              <div key={row.subj} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{row.subj}</div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    장문 평균 이수 {row.avgCompletedUnits} / {row.totalUnits}단원
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="font-bold text-slate-900">{row.avgCpm} 타/분</div>
                  <div className="text-[11px] text-emerald-700">정확도 {row.avgAcc}%</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              교사용 장문 보드 및 게임 단어 추가
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              여기에 추가한 문장과 핵심 단어는 학생들의 장문 연습 보드, 산성비 게임, 레이싱 대결에 즉시 반영됩니다.
            </p>
          </div>

          <form onSubmit={handleCreateCurriculum} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="cur-subj" className="block text-xs text-slate-600 mb-1">
                  과목
                </label>
                <select
                  id="cur-subj"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value as Subject)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:border-sky-600 focus:outline-none"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="cur-unit" className="block text-xs text-slate-600 mb-1">
                  단원 제목
                </label>
                <input
                  id="cur-unit"
                  type="text"
                  placeholder="예: 4단원. 전기의 이용과 안전"
                  value={newUnitTitle}
                  onChange={(e) => setNewUnitTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cur-sentences" className="block text-xs text-slate-600 mb-1">
                복습 문장 (줄바꿈으로 문장 구분)
              </label>
              <textarea
                id="cur-sentences"
                rows={3}
                placeholder="전류가 흐르는 길을 전기 회로라고 합니다.&#10;전지의 직렬연결은 전구를 더 밝게 켭니다."
                value={newSentencesText}
                onChange={(e) => setNewSentencesText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-sky-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label htmlFor="cur-keywords" className="block text-xs text-slate-600 mb-1">
                  게임 연계 핵심 단어 (쉼표로 구분)
                </label>
                <input
                  id="cur-keywords"
                  type="text"
                  placeholder="예: 전기회로, 직렬연결, 병렬연결, 전자석"
                  value={newKeywordsText}
                  onChange={(e) => setNewKeywordsText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-sky-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={savingCurriculum}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                {savingCurriculum ? '저장 중...' : '단원·단어 추가'}
              </button>
            </div>
            {curriculumFeedback && (
              <p className="text-xs font-medium text-sky-700">{curriculumFeedback}</p>
            )}
          </form>
        </section>
      </div>
        </>
      )}
    </main>
  );
};
