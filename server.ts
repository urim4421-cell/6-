import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { buildRacePrompts } from './src/data/curriculum.ts';
import type {
  BootstrapPayload,
  LiveActivity,
  LongPassage,
  PracticeSession,
  RacerState,
  RaceRoom,
  StudentProfile,
  Subject,
  SubjectFilter,
  SubjectStats,
} from './src/types.ts';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'classroom-store.json');

interface StoreData {
  students: StudentProfile[];
  sessions: PracticeSession[];
  customPassages: LongPassage[];
}

function emptySubjectProgress(): Record<Subject, SubjectStats> {
  return {
    국어: { sessions: 0, avgCpm: 0, avgAccuracy: 100, completedPassageIds: [], masteredWords: [] },
    수학: { sessions: 0, avgCpm: 0, avgAccuracy: 100, completedPassageIds: [], masteredWords: [] },
    사회: { sessions: 0, avgCpm: 0, avgAccuracy: 100, completedPassageIds: [], masteredWords: [] },
    과학: { sessions: 0, avgCpm: 0, avgAccuracy: 100, completedPassageIds: [], masteredWords: [] },
  };
}

function createInitialSeedData(): StoreData {
  const now = Date.now();
  const seedConfigs: Array<{
    id: string;
    num: number;
    name: string;
    avgCpm: number;
    bestCpm: number;
    avgAcc: number;
    short: number;
    long: number;
    games: number;
    acid: number;
    wins: number;
    korCpm: number;
    matCpm: number;
    socCpm: number;
    sciCpm: number;
    korIds: string[];
    matIds: string[];
    socIds: string[];
    sciIds: string[];
  }> = [
    {
      id: 'stu-6-1-01',
      num: 1,
      name: '김서연',
      avgCpm: 284,
      bestCpm: 342,
      avgAcc: 97,
      short: 12,
      long: 6,
      games: 5,
      acid: 1480,
      wins: 3,
      korCpm: 295,
      matCpm: 272,
      socCpm: 286,
      sciCpm: 281,
      korIds: ['long-kor-1', 'long-kor-2'],
      matIds: ['long-mat-1', 'long-mat-2'],
      socIds: ['long-soc-1'],
      sciIds: ['long-sci-1'],
    },
    {
      id: 'stu-6-1-02',
      num: 2,
      name: '박준호',
      avgCpm: 246,
      bestCpm: 298,
      avgAcc: 95,
      short: 9,
      long: 4,
      games: 6,
      acid: 1320,
      wins: 2,
      korCpm: 254,
      matCpm: 240,
      socCpm: 248,
      sciCpm: 242,
      korIds: ['long-kor-1'],
      matIds: ['long-mat-1'],
      socIds: ['long-soc-1'],
      sciIds: ['long-sci-2'],
    },
    {
      id: 'stu-6-1-03',
      num: 3,
      name: '이도윤',
      avgCpm: 318,
      bestCpm: 376,
      avgAcc: 98,
      short: 15,
      long: 8,
      games: 7,
      acid: 1850,
      wins: 5,
      korCpm: 325,
      matCpm: 312,
      socCpm: 315,
      sciCpm: 320,
      korIds: ['long-kor-1', 'long-kor-2', 'long-kor-3'],
      matIds: ['long-mat-1', 'long-mat-2'],
      socIds: ['long-soc-1', 'long-soc-2'],
      sciIds: ['long-sci-1'],
    },
    {
      id: 'stu-6-1-04',
      num: 4,
      name: '최하은',
      avgCpm: 212,
      bestCpm: 256,
      avgAcc: 94,
      short: 7,
      long: 3,
      games: 4,
      acid: 960,
      wins: 1,
      korCpm: 224,
      matCpm: 205,
      socCpm: 210,
      sciCpm: 208,
      korIds: ['long-kor-1'],
      matIds: ['long-mat-1'],
      socIds: [],
      sciIds: ['long-sci-1'],
    },
    {
      id: 'stu-6-1-05',
      num: 5,
      name: '정우진',
      avgCpm: 194,
      bestCpm: 235,
      avgAcc: 92,
      short: 6,
      long: 2,
      games: 3,
      acid: 820,
      wins: 0,
      korCpm: 202,
      matCpm: 188,
      socCpm: 195,
      sciCpm: 191,
      korIds: ['long-kor-1'],
      matIds: [],
      socIds: ['long-soc-1'],
      sciIds: [],
    },
    {
      id: 'stu-6-1-06',
      num: 6,
      name: '강지민',
      avgCpm: 265,
      bestCpm: 310,
      avgAcc: 96,
      short: 10,
      long: 5,
      games: 4,
      acid: 1410,
      wins: 2,
      korCpm: 274,
      matCpm: 258,
      socCpm: 264,
      sciCpm: 263,
      korIds: ['long-kor-1', 'long-kor-2'],
      matIds: ['long-mat-2'],
      socIds: ['long-soc-1'],
      sciIds: ['long-sci-1'],
    },
  ];

  const students: StudentProfile[] = seedConfigs.map((cfg, idx) => ({
    id: cfg.id,
    grade: 6,
    classNum: 1,
    studentNum: cfg.num,
    name: cfg.name,
    totalSessions: cfg.short + cfg.long + cfg.games,
    avgCpm: cfg.avgCpm,
    bestCpm: cfg.bestCpm,
    avgAccuracy: cfg.avgAcc,
    shortCompleted: cfg.short,
    longCompleted: cfg.long,
    gamesPlayed: cfg.games,
    bestAcidScore: cfg.acid,
    raceWins: cfg.wins,
    subjectProgress: {
      국어: {
        sessions: 4 + (idx % 3),
        avgCpm: cfg.korCpm,
        avgAccuracy: cfg.avgAcc,
        completedPassageIds: cfg.korIds,
        masteredWords: ['비유적표현', '직유법', '타당한근거'],
      },
      수학: {
        sessions: 3 + (idx % 2),
        avgCpm: cfg.matCpm,
        avgAccuracy: Math.max(88, cfg.avgAcc - 1),
        completedPassageIds: cfg.matIds,
        masteredWords: ['원주율', '비례배분', '백분율'],
      },
      사회: {
        sessions: 3,
        avgCpm: cfg.socCpm,
        avgAccuracy: cfg.avgAcc,
        completedPassageIds: cfg.socIds,
        masteredWords: ['민주주의', '삼권분립', '지속가능발전'],
      },
      과학: {
        sessions: 3 + (idx % 2),
        avgCpm: cfg.sciCpm,
        avgAccuracy: cfg.avgAcc,
        completedPassageIds: cfg.sciIds,
        masteredWords: ['광합성', '증산작용', '이산화탄소'],
      },
    },
    currentActivity: {
      mode: 'IDLE',
      subject: '전체',
      liveCpm: 0,
      liveAccuracy: 100,
      updatedAt: now - (idx + 1) * 180000,
    },
    lastActiveAt: new Date(now - (idx + 1) * 180000).toISOString(),
  }));

  const sessions: PracticeSession[] = [
    {
      id: 'ses-seed-1',
      studentId: 'stu-6-1-03',
      studentName: '이도윤',
      mode: 'LONG',
      subject: '과학',
      itemTitle: '2단원. 식물의 구조와 광합성 작용',
      cpm: 320,
      maxCpm: 368,
      accuracy: 98,
      durationSec: 48,
      score: 320,
      wordsLearned: ['광합성', '증산작용', '엽록체', '이산화탄소'],
      createdAt: new Date(now - 420000).toISOString(),
    },
    {
      id: 'ses-seed-2',
      studentId: 'stu-6-1-01',
      studentName: '김서연',
      mode: 'ACID_RAIN',
      subject: '사회',
      itemTitle: '산성비 2022 교과 단어 방어',
      cpm: 288,
      maxCpm: 334,
      accuracy: 97,
      durationSec: 65,
      score: 1480,
      wordsLearned: ['민주주의', '삼권분립', '지속가능발전'],
      createdAt: new Date(now - 680000).toISOString(),
    },
    {
      id: 'ses-seed-3',
      studentId: 'stu-6-1-06',
      studentName: '강지민',
      mode: 'RACING',
      subject: '수학',
      itemTitle: '교실 실시간 레이싱 대결',
      cpm: 274,
      maxCpm: 310,
      accuracy: 96,
      durationSec: 42,
      score: 1,
      wordsLearned: ['원주율', '비례배분', '직육면체'],
      createdAt: new Date(now - 950000).toISOString(),
    },
    {
      id: 'ses-seed-4',
      studentId: 'stu-6-1-02',
      studentName: '박준호',
      mode: 'SHORT',
      subject: '국어',
      itemTitle: '2단계 도약 단문 연습',
      cpm: 254,
      maxCpm: 290,
      accuracy: 95,
      durationSec: 34,
      score: 254,
      wordsLearned: ['직유법', '타당한근거'],
      createdAt: new Date(now - 1300000).toISOString(),
    },
  ];

  return {
    students,
    sessions,
    customPassages: [],
  };
}

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      const seed = createInitialSeedData();
      fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StoreData;
    return {
      students: Array.isArray(parsed.students) ? parsed.students : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      customPassages: Array.isArray(parsed.customPassages) ? parsed.customPassages : [],
    };
  } catch (err) {
    console.error('Failed to load store, recreating seed:', err);
    const seed = createInitialSeedData();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function saveStore(data: StoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, STORE_PATH);
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

const store = loadStore();
const raceRooms = new Map<string, RaceRoom>();
const clientRoomMap = new Map<WebSocket, { roomId: string; racerId: string }>();

function broadcastAll(payload: unknown): void {
  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function broadcastRoomList(): void {
  const rooms = Array.from(raceRooms.values()).filter((r) => Date.now() - r.createdAt < 600000);
  broadcastAll({ type: 'races:list', rooms });
}

function broadcastRoomState(room: RaceRoom): void {
  broadcastAll({ type: 'race:state', room });
}

function startRaceCountdown(room: RaceRoom): void {
  if (room.status !== 'WAITING') return;
  room.status = 'COUNTDOWN';
  room.countdown = 3;
  broadcastRoomState(room);

  const timer = setInterval(() => {
    const current = raceRooms.get(room.roomId);
    if (!current || current.status !== 'COUNTDOWN') {
      clearInterval(timer);
      return;
    }
    current.countdown -= 1;
    if (current.countdown <= 0) {
      clearInterval(timer);
      current.status = 'RACING';
      current.countdown = 0;
      broadcastRoomState(current);
      broadcastRoomList();
      startBotTicker(current);
    } else {
      broadcastRoomState(current);
    }
  }, 900);
}

function startBotTicker(room: RaceRoom): void {
  if (!room.withBots) return;
  const botSpeeds: Record<string, number> = {};
  for (const r of room.racers) {
    if (r.isBot) {
      botSpeeds[r.id] = r.id.includes('fast') ? 2.1 : 1.45;
    }
  }

  const interval = setInterval(() => {
    const current = raceRooms.get(room.roomId);
    if (!current || current.status !== 'RACING') {
      clearInterval(interval);
      return;
    }

    let changed = false;
    for (const racer of current.racers) {
      if (!racer.isBot || racer.finished) continue;
      const base = botSpeeds[racer.id] ?? 1.6;
      const jitter = (Math.random() - 0.35) * 0.6;
      racer.progressPct = Math.min(100, Number((racer.progressPct + base + jitter).toFixed(1)));
      racer.cpm = Math.round((base * 115) + Math.random() * 26);
      racer.wordsCleared = Math.min(
        current.prompts.length,
        Math.floor((racer.progressPct / 100) * current.prompts.length)
      );
      if (racer.progressPct >= 100) {
        racer.finished = true;
        const finishedCount = current.racers.filter((x) => x.finished && x.finishRank !== null).length;
        racer.finishRank = finishedCount + 1;
      }
      changed = true;
    }

    if (current.racers.every((r) => r.finished)) {
      current.status = 'FINISHED';
      clearInterval(interval);
    }

    if (changed) {
      broadcastRoomState(current);
    }
  }, 450);
}

const app = express();
app.use(express.json());

// REST API Routes
app.get('/api/bootstrap', (_req, res) => {
  const payload: BootstrapPayload = {
    students: store.students,
    sessions: store.sessions.slice(0, 80),
    customPassages: store.customPassages,
  };
  res.json(payload);
});

function createStudentRecord(classNum: number, studentNum: number, name: string): StudentProfile {
  return {
    id: `stu-6-${classNum}-${studentNum}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    grade: 6,
    classNum,
    studentNum,
    name,
    totalSessions: 0,
    avgCpm: 0,
    bestCpm: 0,
    avgAccuracy: 100,
    shortCompleted: 0,
    longCompleted: 0,
    gamesPlayed: 0,
    bestAcidScore: 0,
    raceWins: 0,
    subjectProgress: emptySubjectProgress(),
    currentActivity: {
      mode: 'IDLE',
      subject: '전체',
      liveCpm: 0,
      liveAccuracy: 100,
      updatedAt: Date.now(),
    },
    lastActiveAt: new Date().toISOString(),
  };
}

app.post('/api/students', (req, res) => {
  const { classNum, studentNum, name } = req.body as {
    classNum?: number;
    studentNum?: number;
    name?: string;
  };
  const cleanName = typeof name === 'string' ? name.trim().slice(0, 20) : '';
  const cleanClass = Number(classNum) || 1;
  const cleanNum = Number(studentNum) || 1;

  if (!cleanName) {
    res.status(400).json({ error: '학생 이름을 입력해 주세요.' });
    return;
  }

  let existing = store.students.find(
    (s) => s.classNum === cleanClass && s.studentNum === cleanNum && s.name === cleanName
  );
  if (!existing) {
    existing = createStudentRecord(cleanClass, cleanNum, cleanName);
    store.students.push(existing);
    saveStore(store);
    broadcastAll({ type: 'student:joined', student: existing });
  }

  res.json({ student: existing });
});

app.post('/api/students/bulk', (req, res) => {
  const { classNum, startNum, entries } = req.body as {
    classNum?: number;
    startNum?: number;
    entries?: Array<{ studentNum?: number; name: string }>;
  };
  const cleanClass = Math.max(1, Math.min(20, Number(classNum) || 1));
  let nextNum = Math.max(1, Number(startNum) || 1);

  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: '등록할 학생 명단을 입력해 주세요.' });
    return;
  }

  let addedCount = 0;
  for (const item of entries.slice(0, 60)) {
    const cleanName = typeof item.name === 'string' ? item.name.trim().slice(0, 20) : '';
    if (!cleanName) continue;
    const assignedNum =
      item.studentNum && Number(item.studentNum) > 0 ? Number(item.studentNum) : nextNum++;

    const duplicate = store.students.some(
      (s) => s.classNum === cleanClass && s.studentNum === assignedNum && s.name === cleanName
    );
    if (duplicate) continue;

    const created = createStudentRecord(cleanClass, assignedNum, cleanName);
    store.students.push(created);
    addedCount += 1;
  }

  if (addedCount > 0) {
    saveStore(store);
    broadcastAll({ type: 'roster:updated', students: store.students });
  }

  res.json({ addedCount, students: store.students });
});

app.delete('/api/students/:id', (req, res) => {
  const targetId = req.params.id;
  const beforeLen = store.students.length;
  store.students = store.students.filter((s) => s.id !== targetId);

  if (store.students.length === beforeLen) {
    res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    return;
  }

  saveStore(store);
  broadcastAll({ type: 'roster:updated', students: store.students });
  res.json({ students: store.students });
});

app.post('/api/sessions', (req, res) => {
  const body = req.body as {
    studentId?: string;
    mode?: Exclude<PracticeSession['mode'], never>;
    subject?: SubjectFilter;
    itemTitle?: string;
    cpm?: number;
    maxCpm?: number;
    accuracy?: number;
    durationSec?: number;
    score?: number;
    passageId?: string;
    wordsLearned?: string[];
  };

  const student = store.students.find((s) => s.id === body.studentId);
  if (!student) {
    res.status(404).json({ error: '학생 정보를 찾을 수 없습니다.' });
    return;
  }

  const cpm = Math.max(0, Math.min(1200, Math.round(Number(body.cpm) || 0)));
  const maxCpm = Math.max(cpm, Math.min(1400, Math.round(Number(body.maxCpm) || cpm)));
  const accuracy = Math.max(0, Math.min(100, Math.round(Number(body.accuracy) || 0)));
  const durationSec = Math.max(1, Math.round(Number(body.durationSec) || 1));
  const score = Math.max(0, Math.round(Number(body.score) || cpm));
  const mode = body.mode || 'SHORT';
  const subject: SubjectFilter = body.subject || '전체';
  const wordsLearned = Array.isArray(body.wordsLearned)
    ? body.wordsLearned.filter((w) => typeof w === 'string' && w.trim().length > 0).slice(0, 20)
    : [];

  const session: PracticeSession = {
    id: `ses-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId: student.id,
    studentName: student.name,
    mode,
    subject,
    itemTitle: (body.itemTitle || '타자 연습').slice(0, 120),
    cpm,
    maxCpm,
    accuracy,
    durationSec,
    score,
    wordsLearned,
    createdAt: new Date().toISOString(),
  };

  // Recalculate cumulative averages cleanly
  const prevTotal = student.totalSessions;
  student.avgCpm =
    prevTotal === 0 ? cpm : Math.round((student.avgCpm * prevTotal + cpm) / (prevTotal + 1));
  student.avgAccuracy =
    prevTotal === 0 ? accuracy : Math.round((student.avgAccuracy * prevTotal + accuracy) / (prevTotal + 1));
  student.bestCpm = Math.max(student.bestCpm, maxCpm);
  student.totalSessions += 1;
  student.lastActiveAt = session.createdAt;

  if (mode === 'SHORT') student.shortCompleted += 1;
  if (mode === 'LONG') student.longCompleted += 1;
  if (mode === 'ACID_RAIN') {
    student.gamesPlayed += 1;
    student.bestAcidScore = Math.max(student.bestAcidScore, score);
  }
  if (mode === 'RACING') {
    student.gamesPlayed += 1;
    if (score === 1) student.raceWins += 1;
  }

  // Update subject-level stats
  if (subject !== '전체' && student.subjectProgress[subject]) {
    const subStats = student.subjectProgress[subject];
    const prevSub = subStats.sessions;
    subStats.avgCpm =
      prevSub === 0 ? cpm : Math.round((subStats.avgCpm * prevSub + cpm) / (prevSub + 1));
    subStats.avgAccuracy =
      prevSub === 0
        ? accuracy
        : Math.round((subStats.avgAccuracy * prevSub + accuracy) / (prevSub + 1));
    subStats.sessions += 1;

    if (body.passageId && !subStats.completedPassageIds.includes(body.passageId)) {
      subStats.completedPassageIds.push(body.passageId);
    }
    for (const w of wordsLearned) {
      if (!subStats.masteredWords.includes(w)) {
        subStats.masteredWords.push(w);
      }
    }
  }

  store.sessions.unshift(session);
  if (store.sessions.length > 200) {
    store.sessions = store.sessions.slice(0, 200);
  }

  saveStore(store);
  broadcastAll({ type: 'dashboard:update', student, session });
  res.json({ student, session });
});

app.post('/api/curriculum', (req, res) => {
  const { subject, unitTitle, achievementStandard, difficulty, sentences, keywords } = req.body as {
    subject?: Subject;
    unitTitle?: string;
    achievementStandard?: string;
    difficulty?: '기초' | '표준' | '심화';
    sentences?: string[];
    keywords?: string[];
  };

  if (!subject || !['국어', '수학', '사회', '과학'].includes(subject)) {
    res.status(400).json({ error: '올바른 과목을 선택해 주세요.' });
    return;
  }
  const cleanSentences = Array.isArray(sentences)
    ? sentences.map((s) => s.trim()).filter(Boolean)
    : [];
  const cleanKeywords = Array.isArray(keywords)
    ? keywords.map((k) => k.trim()).filter(Boolean)
    : [];

  if (!unitTitle?.trim() || cleanSentences.length === 0) {
    res.status(400).json({ error: '단원명과 학습 문장을 입력해 주세요.' });
    return;
  }

  const passage: LongPassage = {
    id: `custom-${Date.now().toString(36)}`,
    subject,
    unitTitle: unitTitle.trim().slice(0, 80),
    achievementStandard:
      achievementStandard?.trim() || `2022 개정 [${subject}] 교사 맞춤형 복습 문장`,
    difficulty: difficulty || '표준',
    sentences: cleanSentences,
    keywords: cleanKeywords.length > 0 ? cleanKeywords : [subject],
    isCustom: true,
  };

  store.customPassages.push(passage);
  saveStore(store);
  broadcastAll({ type: 'curriculum:added', passage });
  res.json({ passage });
});

app.get('/api/races', (_req, res) => {
  const rooms = Array.from(raceRooms.values()).filter((r) => Date.now() - r.createdAt < 600000);
  res.json({ rooms });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  const activeRooms = Array.from(raceRooms.values()).filter((r) => Date.now() - r.createdAt < 600000);
  ws.send(JSON.stringify({ type: 'races:list', rooms: activeRooms }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as {
        type: string;
        studentId?: string;
        studentName?: string;
        mode?: LiveActivity['mode'];
        subject?: SubjectFilter;
        liveCpm?: number;
        liveAccuracy?: number;
        roomId?: string;
        roomName?: string;
        withBots?: boolean;
        progressPct?: number;
        cpm?: number;
        accuracy?: number;
        wordsCleared?: number;
        finished?: boolean;
      };

      if (msg.type === 'student:telemetry' && msg.studentId) {
        const student = store.students.find((s) => s.id === msg.studentId);
        if (student) {
          student.currentActivity = {
            mode: msg.mode || 'IDLE',
            subject: msg.subject || '전체',
            liveCpm: Math.round(Number(msg.liveCpm) || 0),
            liveAccuracy: Math.round(Number(msg.liveAccuracy) || 100),
            updatedAt: Date.now(),
          };
          broadcastAll({
            type: 'telemetry:update',
            studentId: student.id,
            currentActivity: student.currentActivity,
          });
        }
        return;
      }

      if (msg.type === 'race:create' && msg.studentId && msg.studentName) {
        const roomId = `race-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const subject: SubjectFilter = msg.subject || '전체';
        const prompts = buildRacePrompts(subject, store.customPassages);
        const racers: RacerState[] = [
          {
            id: msg.studentId,
            name: msg.studentName,
            isBot: false,
            progressPct: 0,
            cpm: 0,
            accuracy: 100,
            wordsCleared: 0,
            finished: false,
            finishRank: null,
            colorIndex: 0,
          },
        ];

        if (msg.withBots) {
          racers.push(
            {
              id: `bot-rabbit-${roomId}`,
              name: '다람쥐 페이스메이커',
              isBot: true,
              progressPct: 0,
              cpm: 185,
              accuracy: 96,
              wordsCleared: 0,
              finished: false,
              finishRank: null,
              colorIndex: 1,
            },
            {
              id: `bot-cheetah-fast-${roomId}`,
              name: '치타 페이스메이커',
              isBot: true,
              progressPct: 0,
              cpm: 255,
              accuracy: 98,
              wordsCleared: 0,
              finished: false,
              finishRank: null,
              colorIndex: 2,
            }
          );
        }

        const room: RaceRoom = {
          roomId,
          roomName: (msg.roomName || `${msg.studentName}의 ${subject} 레이싱방`).slice(0, 40),
          hostId: msg.studentId,
          hostName: msg.studentName,
          subject,
          status: 'WAITING',
          countdown: 3,
          withBots: Boolean(msg.withBots),
          prompts,
          racers,
          createdAt: Date.now(),
        };

        raceRooms.set(roomId, room);
        clientRoomMap.set(ws, { roomId, racerId: msg.studentId });
        broadcastRoomState(room);
        broadcastRoomList();
        return;
      }

      if (msg.type === 'race:join' && msg.roomId && msg.studentId && msg.studentName) {
        const room = raceRooms.get(msg.roomId);
        if (!room || room.status !== 'WAITING') return;
        const already = room.racers.find((r) => r.id === msg.studentId);
        if (!already && room.racers.length < 6) {
          room.racers.push({
            id: msg.studentId,
            name: msg.studentName,
            isBot: false,
            progressPct: 0,
            cpm: 0,
            accuracy: 100,
            wordsCleared: 0,
            finished: false,
            finishRank: null,
            colorIndex: room.racers.length % 5,
          });
        }
        clientRoomMap.set(ws, { roomId: room.roomId, racerId: msg.studentId });
        broadcastRoomState(room);
        broadcastRoomList();
        return;
      }

      if (msg.type === 'race:start' && msg.roomId) {
        const room = raceRooms.get(msg.roomId);
        if (room && room.status === 'WAITING') {
          startRaceCountdown(room);
        }
        return;
      }

      if (msg.type === 'race:progress' && msg.roomId && msg.studentId) {
        const room = raceRooms.get(msg.roomId);
        if (!room || room.status !== 'RACING') return;
        const racer = room.racers.find((r) => r.id === msg.studentId);
        if (!racer || racer.finished) return;

        racer.progressPct = Math.min(100, Math.max(racer.progressPct, Number(msg.progressPct) || 0));
        racer.cpm = Math.round(Number(msg.cpm) || 0);
        racer.accuracy = Math.round(Number(msg.accuracy) || 100);
        racer.wordsCleared = Math.round(Number(msg.wordsCleared) || 0);

        if (msg.finished || racer.progressPct >= 100) {
          racer.progressPct = 100;
          racer.finished = true;
          const finishedCount = room.racers.filter((x) => x.finished && x.finishRank !== null).length;
          racer.finishRank = finishedCount + 1;
        }

        if (room.racers.every((r) => r.finished)) {
          room.status = 'FINISHED';
        }
        broadcastRoomState(room);
        return;
      }

      if (msg.type === 'race:leave' && msg.roomId && msg.studentId) {
        const room = raceRooms.get(msg.roomId);
        if (!room) return;
        room.racers = room.racers.filter((r) => r.id !== msg.studentId);
        clientRoomMap.delete(ws);
        if (room.racers.filter((r) => !r.isBot).length === 0) {
          raceRooms.delete(room.roomId);
        } else {
          broadcastRoomState(room);
        }
        broadcastRoomList();
      }
    } catch {
      // Ignore malformed client WS messages
    }
  });

  ws.on('close', () => {
    const info = clientRoomMap.get(ws);
    if (info) {
      const room = raceRooms.get(info.roomId);
      if (room && room.status === 'WAITING') {
        room.racers = room.racers.filter((r) => r.id !== info.racerId);
        if (room.racers.filter((r) => !r.isBot).length === 0) {
          raceRooms.delete(room.roomId);
        } else {
          broadcastRoomState(room);
        }
        broadcastRoomList();
      }
      clientRoomMap.delete(ws);
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
