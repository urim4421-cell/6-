import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AcidRainGame } from './components/AcidRainGame';
import { Header } from './components/Header';
import { LongPracticeView } from './components/LongPracticeView';
import { RacingGame } from './components/RacingGame';
import { ShortPracticeView } from './components/ShortPracticeView';
import { StudentEntryModal } from './components/StudentEntryModal';
import { StudentHomeView } from './components/StudentHomeView';
import { TeacherDashboard } from './components/TeacherDashboard';
import type {
  AppTab,
  BootstrapPayload,
  LiveActivity,
  LongPassage,
  PracticeMode,
  PracticeSession,
  RaceRoom,
  StudentProfile,
  Subject,
  SubjectFilter,
} from './types';

const STORAGE_STUDENT_KEY = 'hanbit_typing_student_id';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('HOME');
  const [selectedSubject, setSelectedSubject] = useState<SubjectFilter>('전체');

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [customPassages, setCustomPassages] = useState<LongPassage[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_STUDENT_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  // Real-time WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [rooms, setRooms] = useState<RaceRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial data bootstrap
  useEffect(() => {
    let active = true;
    const loadBootstrap = async () => {
      try {
        const res = await fetch('/api/bootstrap');
        if (!res.ok) return;
        const data = (await res.json()) as BootstrapPayload;
        if (!active) return;
        setStudents(data.students);
        setSessions(data.sessions);
        setCustomPassages(data.customPassages);
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadBootstrap();
    return () => {
      active = false;
    };
  }, []);

  // Persistent WebSocket connection with auto-reconnect
  useEffect(() => {
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            student?: StudentProfile;
            students?: StudentProfile[];
            session?: PracticeSession;
            studentId?: string;
            currentActivity?: LiveActivity;
            passage?: LongPassage;
            rooms?: RaceRoom[];
            room?: RaceRoom;
          };

          if (msg.type === 'student:joined' && msg.student) {
            const joined = msg.student;
            setStudents((prev) =>
              prev.some((s) => s.id === joined.id) ? prev : [...prev, joined]
            );
          } else if (msg.type === 'roster:updated' && Array.isArray(msg.students)) {
            setStudents(msg.students);
          } else if (msg.type === 'dashboard:update' && msg.student && msg.session) {
            const updatedStu = msg.student;
            const newSes = msg.session;
            setStudents((prev) => {
              const exists = prev.some((s) => s.id === updatedStu.id);
              return exists
                ? prev.map((s) => (s.id === updatedStu.id ? updatedStu : s))
                : [...prev, updatedStu];
            });
            setSessions((prev) =>
              prev.some((x) => x.id === newSes.id) ? prev : [newSes, ...prev].slice(0, 100)
            );
          } else if (msg.type === 'telemetry:update' && msg.studentId && msg.currentActivity) {
            const targetId = msg.studentId;
            const activity = msg.currentActivity;
            setStudents((prev) =>
              prev.map((s) => (s.id === targetId ? { ...s, currentActivity: activity } : s))
            );
          } else if (msg.type === 'curriculum:added' && msg.passage) {
            const added = msg.passage;
            setCustomPassages((prev) =>
              prev.some((p) => p.id === added.id) ? prev : [...prev, added]
            );
          } else if (msg.type === 'races:list' && Array.isArray(msg.rooms)) {
            setRooms(msg.rooms);
          } else if (msg.type === 'race:state' && msg.room) {
            const updatedRoom = msg.room;
            setRooms((prev) => {
              const exists = prev.some((r) => r.roomId === updatedRoom.roomId);
              return exists
                ? prev.map((r) => (r.roomId === updatedRoom.roomId ? updatedRoom : r))
                : [...prev, updatedRoom];
            });
            if (
              currentStudentId &&
              updatedRoom.racers.some((r) => r.id === currentStudentId)
            ) {
              setActiveRoomId(updatedRoom.roomId);
            }
          }
        } catch {
          // Ignore malformed WS payloads
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closed) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [currentStudentId]);

  const currentStudent = useMemo(
    () => students.find((s) => s.id === currentStudentId) || null,
    [students, currentStudentId]
  );

  const activeRoom = useMemo(
    () => rooms.find((r) => r.roomId === activeRoomId) || null,
    [rooms, activeRoomId]
  );

  const selectStudent = useCallback((student: StudentProfile) => {
    setCurrentStudentId(student.id);
    try {
      localStorage.setItem(STORAGE_STUDENT_KEY, student.id);
    } catch {
      // Ignore storage error
    }
  }, []);

  const createOrLoginStudent = useCallback(
    async (classNum: number, studentNum: number, name: string) => {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classNum, studentNum, name }),
      });
      if (!res.ok) throw new Error('학생 접속 실패');
      const data = (await res.json()) as { student: StudentProfile };
      setStudents((prev) =>
        prev.some((s) => s.id === data.student.id) ? prev : [...prev, data.student]
      );
      selectStudent(data.student);
    },
    [selectStudent]
  );

  const bulkAddStudents = useCallback(
    async (
      classNum: number,
      startNum: number,
      entries: Array<{ studentNum?: number; name: string }>
    ) => {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classNum, startNum, entries }),
      });

      if (res.status === 404) {
        // Fallback to single-student registration endpoint if needed
        let nextNum = Math.max(1, Number(startNum) || 1);
        let added = 0;
        for (const item of entries) {
          const cleanName = item.name.trim();
          if (!cleanName) continue;
          const studentNum =
            item.studentNum && item.studentNum > 0 ? item.studentNum : nextNum++;
          const singleRes = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classNum, studentNum, name: cleanName }),
          });
          if (singleRes.ok) {
            const singleData = (await singleRes.json()) as { student: StudentProfile };
            setStudents((prev) =>
              prev.some((s) => s.id === singleData.student.id)
                ? prev
                : [...prev, singleData.student]
            );
            added += 1;
          }
        }
        return added;
      }

      const rawText = await res.text();
      let parsed: { addedCount?: number; students?: StudentProfile[]; error?: string } = {};
      try {
        parsed = JSON.parse(rawText) as {
          addedCount?: number;
          students?: StudentProfile[];
          error?: string;
        };
      } catch {
        // Non-JSON response
      }

      if (!res.ok) {
        throw new Error(parsed.error || `명단 등록 실패 (HTTP ${res.status})`);
      }

      if (Array.isArray(parsed.students)) {
        setStudents(parsed.students);
      }
      return parsed.addedCount ?? 0;
    },
    []
  );

  const deleteStudent = useCallback(
    async (studentId: string) => {
      const res = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('학생 삭제 실패');
      const data = (await res.json()) as { students: StudentProfile[] };
      setStudents(data.students);
      if (currentStudentId === studentId) {
        setCurrentStudentId(null);
        try {
          localStorage.removeItem(STORAGE_STUDENT_KEY);
        } catch {
          // Ignore storage error
        }
      }
    },
    [currentStudentId]
  );

  const reportTelemetry = useCallback(
    (mode: PracticeMode, subject: SubjectFilter, liveCpm: number, liveAccuracy: number) => {
      if (!currentStudentId || wsRef.current?.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'student:telemetry',
          studentId: currentStudentId,
          mode,
          subject,
          liveCpm,
          liveAccuracy,
        })
      );
    },
    [currentStudentId]
  );

  const completeSession = useCallback(
    async (payload: {
      mode: Exclude<PracticeMode, 'IDLE'>;
      subject: SubjectFilter;
      itemTitle: string;
      cpm: number;
      maxCpm: number;
      accuracy: number;
      durationSec: number;
      score: number;
      passageId?: string;
      wordsLearned?: string[];
    }) => {
      if (!currentStudentId) return;
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentStudentId,
          ...payload,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        student: StudentProfile;
        session: PracticeSession;
      };
      setStudents((prev) => prev.map((s) => (s.id === data.student.id ? data.student : s)));
      setSessions((prev) =>
        prev.some((x) => x.id === data.session.id)
          ? prev
          : [data.session, ...prev].slice(0, 100)
      );
    },
    [currentStudentId]
  );

  const addCurriculumPassage = useCallback(
    async (payload: {
      subject: Subject;
      unitTitle: string;
      achievementStandard: string;
      difficulty: '기초' | '표준' | '심화';
      sentences: string[];
      keywords: string[];
    }) => {
      const res = await fetch('/api/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('문장 추가 실패');
      const data = (await res.json()) as { passage: LongPassage };
      setCustomPassages((prev) =>
        prev.some((p) => p.id === data.passage.id) ? prev : [...prev, data.passage]
      );
    },
    []
  );

  const sendWs = useCallback((payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const handleCreateRaceRoom = useCallback(
    (subject: SubjectFilter, withBots: boolean, roomName: string) => {
      if (!currentStudent) return;
      sendWs({
        type: 'race:create',
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        subject,
        withBots,
        roomName,
      });
    },
    [currentStudent, sendWs]
  );

  const handleJoinRaceRoom = useCallback(
    (roomId: string) => {
      if (!currentStudent) return;
      setActiveRoomId(roomId);
      sendWs({
        type: 'race:join',
        roomId,
        studentId: currentStudent.id,
        studentName: currentStudent.name,
      });
    },
    [currentStudent, sendWs]
  );

  const handleStartRaceRoom = useCallback(
    (roomId: string) => {
      sendWs({ type: 'race:start', roomId });
    },
    [sendWs]
  );

  const handleLeaveRaceRoom = useCallback(
    (roomId: string) => {
      if (currentStudent) {
        sendWs({ type: 'race:leave', roomId, studentId: currentStudent.id });
      }
      setActiveRoomId(null);
    },
    [currentStudent, sendWs]
  );

  const handleSendRaceProgress = useCallback(
    (
      roomId: string,
      progressPct: number,
      cpm: number,
      accuracy: number,
      wordsCleared: number,
      finished: boolean
    ) => {
      if (!currentStudent) return;
      sendWs({
        type: 'race:progress',
        roomId,
        studentId: currentStudent.id,
        progressPct,
        cpm,
        accuracy,
        wordsCleared,
        finished,
      });
    },
    [currentStudent, sendWs]
  );

  const handleNavigateWithSubject = useCallback((tab: AppTab, subject: SubjectFilter) => {
    setSelectedSubject(subject);
    setActiveTab(tab);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentStudent={currentStudent}
        onOpenStudentModal={() => setStudentModalOpen(true)}
      />

      <div className="flex-1">
        {loading ? (
          <div className="mx-auto max-w-[1280px] px-6 py-16 text-center text-sm text-slate-500">
            학급 학습 데이터를 불러오는 중입니다...
          </div>
        ) : activeTab === 'HOME' ? (
          <StudentHomeView
            students={students}
            currentStudent={currentStudent}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
            onSelectStudent={selectStudent}
            onCreateStudent={createOrLoginStudent}
            onNavigate={setActiveTab}
          />
        ) : activeTab === 'SHORT' ? (
          <ShortPracticeView
            currentStudent={currentStudent}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
            onRequireStudent={() => setStudentModalOpen(true)}
            onReportTelemetry={reportTelemetry}
            onCompleteSession={completeSession}
          />
        ) : activeTab === 'LONG' ? (
          <LongPracticeView
            currentStudent={currentStudent}
            selectedSubject={selectedSubject}
            customPassages={customPassages}
            onSelectSubject={setSelectedSubject}
            onRequireStudent={() => setStudentModalOpen(true)}
            onReportTelemetry={reportTelemetry}
            onCompleteSession={completeSession}
            onNavigateWithSubject={handleNavigateWithSubject}
          />
        ) : activeTab === 'ACID_RAIN' ? (
          <AcidRainGame
            currentStudent={currentStudent}
            selectedSubject={selectedSubject}
            customPassages={customPassages}
            onSelectSubject={setSelectedSubject}
            onRequireStudent={() => setStudentModalOpen(true)}
            onReportTelemetry={reportTelemetry}
            onCompleteSession={completeSession}
          />
        ) : activeTab === 'RACING' ? (
          <RacingGame
            currentStudent={currentStudent}
            selectedSubject={selectedSubject}
            customPassages={customPassages}
            rooms={rooms}
            activeRoom={activeRoom}
            onSelectSubject={setSelectedSubject}
            onRequireStudent={() => setStudentModalOpen(true)}
            onCreateRoom={handleCreateRaceRoom}
            onJoinRoom={handleJoinRaceRoom}
            onStartRoom={handleStartRaceRoom}
            onLeaveRoom={handleLeaveRaceRoom}
            onSendRaceProgress={handleSendRaceProgress}
            onReportTelemetry={reportTelemetry}
            onCompleteSession={completeSession}
          />
        ) : (
          <TeacherDashboard
            students={students}
            sessions={sessions}
            customPassages={customPassages}
            wsConnected={wsConnected}
            onAddCurriculumPassage={addCurriculumPassage}
            onBulkAddStudents={bulkAddStudents}
            onDeleteStudent={deleteStudent}
          />
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        한빛타자 6학년 · 2022 개정 초등 교육과정(국어·수학·사회·과학) 연계 타자 학습 플랫폼
      </footer>

      <StudentEntryModal
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        students={students}
        currentStudent={currentStudent}
        onSelectStudent={selectStudent}
        onCreateStudent={createOrLoginStudent}
      />
    </div>
  );
}
